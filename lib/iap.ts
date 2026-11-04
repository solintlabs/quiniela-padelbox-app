import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';
import { api } from './api';
import { saasApi } from './saas-api';

/**
 * Compra integrada del plan Pro (App Store / Google Play) vía RevenueCat.
 *
 * Reglas:
 *  - Apple obliga a vender bienes digitales con IAP (guía 3.1.1): el checkout
 *    web de Stripe queda solo para quinielabox.com.
 *  - El id de usuario en RevenueCat es NUESTRO User.id: así el servidor puede
 *    pedir el subscriber a RevenueCat y verificar la compra sin fiarse de la app.
 *  - La compra NO activa nada por sí sola: hay que RECLAMARLA para una
 *    quiniela concreta (claimPurchase). Si la app muere entre pagar y reclamar,
 *    "Restaurar compras" vuelve a intentarlo.
 *
 * Las claves públicas viven en app.json → extra.revenueCat. Sin clave para la
 * plataforma, `iapAvailable()` es false y Planes vuelve al link web.
 */

const KEYS = (Constants.expoConfig?.extra?.revenueCat ?? {}) as { ios?: string; android?: string };

let configured = false;
let identityUserId: string | null = null;

export function iapAvailable(): boolean {
  if (Platform.OS === 'ios') return !!KEYS.ios;
  if (Platform.OS === 'android') return !!KEYS.android;
  return false;
}

function configureOnce(): void {
  if (configured || !iapAvailable()) return;
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
  Purchases.configure({ apiKey: Platform.OS === 'ios' ? KEYS.ios! : KEYS.android! });
  configured = true;
}

/**
 * Deja a RevenueCat identificado con el usuario de la sesión. Idempotente y
 * barato de repetir; se llama antes de cualquier operación de compra.
 */
export async function ensureIapIdentity(): Promise<string> {
  configureOnce();
  if (!configured) throw new Error('Compras no disponibles en este dispositivo.');
  const { me } = await api.me();
  if (identityUserId !== me.id) {
    await Purchases.logIn(me.id);
    identityUserId = me.id;
  }
  return me.id;
}

export interface StorePrice {
  productId: string;
  /** Precio ya formateado por la tienda en la moneda del usuario ("$29.99"). */
  priceString: string;
  pkg: PurchasesPackage;
}

/** Precios reales de la tienda por producto. Vacío si algo falla: la UI usa los del backend. */
export async function loadStorePrices(): Promise<Record<string, StorePrice>> {
  try {
    configureOnce();
    if (!configured) return {};
    const offerings = await Purchases.getOfferings();
    const out: Record<string, StorePrice> = {};
    for (const pkg of offerings.current?.availablePackages ?? []) {
      out[pkg.product.identifier] = {
        productId: pkg.product.identifier,
        priceString: pkg.product.priceString,
        pkg,
      };
    }
    return out;
  } catch {
    return {};
  }
}

export class PurchaseCancelled extends Error {
  constructor() {
    super('Compra cancelada');
  }
}

export interface PurchaseOutcome {
  productId: string;
  /** Transacción de tienda; la temporada la necesita para reclamarse. */
  transactionId: string | undefined;
}

/** Abre la hoja de pago nativa. Lanza PurchaseCancelled si el usuario la cierra. */
export async function purchaseProduct(price: StorePrice): Promise<PurchaseOutcome> {
  await ensureIapIdentity();
  try {
    const result = await Purchases.purchasePackage(price.pkg);
    return {
      productId: result.productIdentifier,
      transactionId: result.transaction?.transactionIdentifier ?? undefined,
    };
  } catch (e) {
    if ((e as { userCancelled?: boolean }).userCancelled) throw new PurchaseCancelled();
    throw new Error(friendly(e));
  }
}

/** Aplica una compra ya hecha a una quiniela concreta (verificado en el servidor). */
export async function claimPurchase(slug: string, outcome: PurchaseOutcome) {
  return saasApi.claimIap(slug, outcome.productId, outcome.transactionId);
}

export class ClaimFailed extends Error {
  constructor(message: string) {
    super(message);
  }
}

/**
 * Flujo completo para UNA quiniela: hoja de pago → reclamación en el servidor.
 * Si el pago salió pero la reclamación falló, lanza ClaimFailed: el dinero
 * ya se cobró y la UI debe ofrecer "Restaurar compras", no "vuelve a pagar".
 */
export async function buyForTenant(
  slug: string,
  productId: string,
  prices?: Record<string, StorePrice>,
): Promise<{ plan: string; proUntil: string | null }> {
  const table = prices && prices[productId] ? prices : await loadStorePrices();
  const price = table[productId];
  if (!price) {
    throw new Error('La tienda no devolvió el precio. Comprueba tu conexión e inténtalo de nuevo.');
  }
  const outcome = await purchaseProduct(price);
  try {
    const res = await claimPurchase(slug, outcome);
    return { plan: res.plan, proUntil: res.proUntil };
  } catch (e) {
    throw new ClaimFailed(e instanceof Error ? e.message : 'No se pudo activar el plan.');
  }
}

/**
 * Compras hechas en esta cuenta de tienda que podrían no estar aplicadas aún
 * (temporadas sueltas y la suscripción mensual activa). Para el botón
 * "Restaurar compras".
 */
export async function restorablePurchases(products: { season: string; monthly: string }): Promise<PurchaseOutcome[]> {
  await ensureIapIdentity();
  const info: CustomerInfo = await Purchases.restorePurchases();
  const out: PurchaseOutcome[] = [];
  for (const t of info.nonSubscriptionTransactions) {
    if (t.productIdentifier === products.season) {
      out.push({ productId: t.productIdentifier, transactionId: t.transactionIdentifier });
    }
  }
  if (info.activeSubscriptions.includes(products.monthly)) {
    out.push({ productId: products.monthly, transactionId: undefined });
  }
  return out;
}

function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/network|offline|internet/i.test(msg)) return 'Sin conexión. Revisa tu red e inténtalo de nuevo.';
  if (/not allowed|restricted/i.test(msg)) return 'Este dispositivo no permite compras dentro de apps.';
  if (/pending|deferred/i.test(msg)) return 'La compra quedó pendiente de aprobación. Vuelve cuando se confirme.';
  return msg || 'No se pudo completar la compra.';
}
