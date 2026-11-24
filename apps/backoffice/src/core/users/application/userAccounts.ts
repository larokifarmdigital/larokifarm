import { z } from 'zod';
import { MODULOS, type Modulo, type SaveResult } from '@/core/shared';
import {
  CuentaConHistorialError,
  ROLES_CUENTA,
  UltimoAdminError,
  type ActorCuenta,
  type CuentaConContrasena,
  type FarmaciaOpcion,
  type UserAccount,
  type UserAccountRepository,
} from '../domain';
import {
  MAX_BYTES_CONTRASENA,
  MIN_CONTRASENA,
  compararContrasena,
  generarContrasenaTemporal,
  hashContrasena,
} from './passwords';

const SOLO_ADMIN = 'Solo un administrador puede gestionar usuarios.';
const ERROR_GENERICO = 'No se ha podido guardar. Vuelve a intentarlo.';

/** Registro de operaciones de administración: quién, qué y sobre quién (sin datos personales ni contraseñas). */
function registrar(actorId: string, accion: string, targetId: string) {
  console.info(JSON.stringify({ evento: 'usuarios', actorId, accion, targetId, ts: new Date().toISOString() }));
}

/** Errores de BD: solo el código al log (el objeto completo puede llevar datos de la consulta). */
function registrarFallo(accion: string, e: unknown) {
  console.error('[usuarios] error al', accion, (e as { code?: string })?.code ?? (e as Error)?.name);
}

const nombreSchema = z.string().trim().min(2, 'Escribe el nombre completo').max(80, 'Máximo 80 caracteres');
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(120, 'Máximo 120 caracteres')
  .pipe(z.email('Escribe un correo válido'));
const rolSchema = z.enum(ROLES_CUENTA as [string, ...string[]], 'Elige un rol');
const farmaciasSchema = z
  .array(z.string().trim().min(1).max(64))
  .max(50, 'Demasiadas farmacias')
  .transform((ids) => [...new Set(ids)]);

const modulosSchema = z
  .array(z.enum(MODULOS as [Modulo, ...Modulo[]], 'Módulo no válido'))
  .max(MODULOS.length)
  .default([])
  .transform((ms) => [...new Set(ms)]);

const crearSchema = z.object({ nombre: nombreSchema, email: emailSchema, rol: rolSchema, farmaciaIds: farmaciasSchema, modulos: modulosSchema });
const editarSchema = z.object({ nombre: nombreSchema, rol: rolSchema, farmaciaIds: farmaciasSchema, modulos: modulosSchema });

function erroresDe(e: z.ZodError): SaveResult<never> {
  const fieldErrors: Record<string, string> = {};
  for (const i of e.issues) {
    const k = i.path[0]?.toString();
    if (k && !fieldErrors[k]) fieldErrors[k] = i.message;
  }
  return { ok: false, error: 'Revisa los campos marcados', fieldErrors };
}

/**
 * Gestión de cuentas (Ajustes → Usuarios). Todas las reglas se comprueban aquí,
 * en el servidor: la UI solo las refleja.
 * - Solo SUPER_ADMIN gestiona usuarios.
 * - Nadie se desactiva ni se quita el rol de administrador a sí mismo.
 * - Siempre queda al menos un administrador activo.
 * - Los módulos (conciliador, comparador) los marca el administrador; él los
 *   tiene todos sin marcarlos. Los usuarios nuevos empiezan sin ninguno.
 * - Responsable y Solo consulta necesitan al menos una farmacia (mismo rol en
 *   todas); el administrador puede no tener ninguna.
 * - Las contraseñas temporales se generan aquí y se devuelven una sola vez.
 * - Solo se elimina una cuenta sin historial; con conciliaciones, se desactiva.
 */
export class UserAccountsService {
  constructor(private readonly repo: UserAccountRepository) {}

  private esAdmin(actor: ActorCuenta | null): actor is ActorCuenta {
    return actor?.rol === 'admin';
  }

  /**
   * El rol de la sesión puede tener hasta 5 min de antigüedad: para escribir,
   * se relee de la BD que el actor sigue siendo administrador y está activo.
   */
  private async esAdminVigente(actor: ActorCuenta | null): Promise<boolean> {
    if (!this.esAdmin(actor)) return false;
    const yo = await this.repo.findById(actor.id);
    return !!yo && yo.activo && yo.rol === 'admin';
  }

  async listar(actor: ActorCuenta | null): Promise<{ cuentas: UserAccount[]; farmacias: FarmaciaOpcion[] } | null> {
    if (!this.esAdmin(actor)) return null;
    const [cuentas, farmacias] = await Promise.all([this.repo.list(), this.repo.listFarmacias()]);
    return { cuentas, farmacias };
  }

  private async validarFarmacias(rol: string, farmaciaIds: string[]): Promise<Record<string, string> | null> {
    if (rol !== 'admin' && farmaciaIds.length === 0) return { farmaciaIds: 'Elige al menos una farmacia' };
    if (!(await this.repo.farmaciasExisten(farmaciaIds))) return { farmaciaIds: 'Alguna de esas farmacias ya no existe' };
    return null;
  }

  async crear(actor: ActorCuenta | null, raw: unknown): Promise<SaveResult<CuentaConContrasena>> {
    if (!this.esAdmin(actor) || !(await this.esAdminVigente(actor))) return { ok: false, error: SOLO_ADMIN };
    const p = crearSchema.safeParse(raw);
    if (!p.success) return erroresDe(p.error);
    const { nombre, email, rol, farmaciaIds, modulos } = p.data;
    const errFarmacia = await this.validarFarmacias(rol, farmaciaIds);
    if (errFarmacia) return { ok: false, error: 'Revisa los campos marcados', fieldErrors: errFarmacia };
    if (await this.repo.emailExists(email)) {
      return { ok: false, error: 'Revisa los campos marcados', fieldErrors: { email: 'Ya hay un usuario con ese correo' } };
    }
    const contrasenaTemporal = generarContrasenaTemporal();
    try {
      const cuenta = await this.repo.create({
        nombre,
        email,
        rol: rol as UserAccount['rol'],
        farmaciaIds,
        modulos,
        passwordHash: await hashContrasena(contrasenaTemporal),
      });
      registrar(actor.id, 'crear', cuenta.id);
      return { ok: true, data: { cuenta, contrasenaTemporal } };
    } catch (e) {
      // Carrera con el índice único del email.
      if ((e as { code?: string })?.code === 'P2002') {
        return { ok: false, error: 'Revisa los campos marcados', fieldErrors: { email: 'Ya hay un usuario con ese correo' } };
      }
      registrarFallo('crear', e);
      return { ok: false, error: 'No se pudo crear el usuario. Vuelve a intentarlo.' };
    }
  }

  async editar(actor: ActorCuenta | null, id: string, raw: unknown): Promise<SaveResult<UserAccount>> {
    if (!this.esAdmin(actor) || !(await this.esAdminVigente(actor))) return { ok: false, error: SOLO_ADMIN };
    const actual = await this.repo.findById(id);
    if (!actual) return { ok: false, error: 'Ese usuario ya no existe.' };
    const p = editarSchema.safeParse(raw);
    if (!p.success) return erroresDe(p.error);
    const { nombre, rol, farmaciaIds, modulos } = p.data;
    if (actual.id === actor.id && rol !== 'admin') {
      return { ok: false, error: 'No puedes quitarte a ti mismo el rol de administrador.', fieldErrors: { rol: 'No puedes quitarte tu propio rol de administrador' } };
    }
    if (actual.rol === 'admin' && rol !== 'admin' && actual.activo && (await this.repo.countActiveAdmins(id)) === 0) {
      return { ok: false, error: 'Tiene que quedar al menos un administrador activo.' };
    }
    const errFarmacia = await this.validarFarmacias(rol, farmaciaIds);
    if (errFarmacia) return { ok: false, error: 'Revisa los campos marcados', fieldErrors: errFarmacia };
    try {
      const cuenta = await this.repo.update(
        id,
        { nombre, rol: rol as UserAccount['rol'], farmaciaIds, modulos },
        // Quitar el rol a un administrador: comprobación + escritura atómicas.
        { exigirOtroAdminActivo: actual.rol === 'admin' && rol !== 'admin' },
      );
      const cambios = [
        actual.rol !== rol ? `rol:${actual.rol}→${rol}` : null,
        [...actual.modulos].sort().join(',') !== [...modulos].sort().join(',') ? `modulos:${modulos.join(',') || '-'}` : null,
      ].filter(Boolean);
      registrar(actor.id, cambios.length ? `editar(${cambios.join(';')})` : 'editar', id);
      return { ok: true, data: cuenta };
    } catch (e) {
      if (e instanceof UltimoAdminError) return { ok: false, error: e.message };
      registrarFallo('editar', e);
      return { ok: false, error: ERROR_GENERICO };
    }
  }

  async cambiarActivo(actor: ActorCuenta | null, id: string, activo: boolean): Promise<SaveResult<UserAccount>> {
    if (!this.esAdmin(actor) || !(await this.esAdminVigente(actor))) return { ok: false, error: SOLO_ADMIN };
    if (typeof activo !== 'boolean') return { ok: false, error: 'Petición no válida.' };
    const actual = await this.repo.findById(id);
    if (!actual) return { ok: false, error: 'Ese usuario ya no existe.' };
    if (!activo && actual.id === actor.id) return { ok: false, error: 'No puedes desactivar tu propia cuenta.' };
    if (!activo && actual.rol === 'admin' && (await this.repo.countActiveAdmins(id)) === 0) {
      return { ok: false, error: 'Tiene que quedar al menos un administrador activo.' };
    }
    try {
      const cuenta = await this.repo.setActive(id, activo, { exigirOtroAdminActivo: !activo && actual.rol === 'admin' });
      registrar(actor.id, activo ? 'reactivar' : 'desactivar', id);
      return { ok: true, data: cuenta };
    } catch (e) {
      if (e instanceof UltimoAdminError) return { ok: false, error: e.message };
      registrarFallo(activo ? 'reactivar' : 'desactivar', e);
      return { ok: false, error: ERROR_GENERICO };
    }
  }

  async eliminar(actor: ActorCuenta | null, id: string): Promise<SaveResult<true>> {
    if (!this.esAdmin(actor) || !(await this.esAdminVigente(actor))) return { ok: false, error: SOLO_ADMIN };
    const actual = await this.repo.findById(id);
    if (!actual) return { ok: false, error: 'Ese usuario ya no existe.' };
    if (actual.id === actor.id) return { ok: false, error: 'No puedes eliminar tu propia cuenta.' };
    if (actual.tieneHistorial) return { ok: false, error: new CuentaConHistorialError().message };
    const eraAdminActivo = actual.rol === 'admin' && actual.activo;
    if (eraAdminActivo && (await this.repo.countActiveAdmins(id)) === 0) {
      return { ok: false, error: 'Tiene que quedar al menos un administrador activo.' };
    }
    try {
      await this.repo.delete(id, { exigirOtroAdminActivo: eraAdminActivo });
      registrar(actor.id, 'eliminar', id);
      return { ok: true, data: true };
    } catch (e) {
      if (e instanceof UltimoAdminError || e instanceof CuentaConHistorialError) return { ok: false, error: e.message };
      registrarFallo('eliminar', e);
      return { ok: false, error: 'No se ha podido eliminar. Vuelve a intentarlo.' };
    }
  }

  async restablecerContrasena(actor: ActorCuenta | null, id: string): Promise<SaveResult<CuentaConContrasena>> {
    if (!this.esAdmin(actor) || !(await this.esAdminVigente(actor))) return { ok: false, error: SOLO_ADMIN };
    const actual = await this.repo.findById(id);
    if (!actual) return { ok: false, error: 'Ese usuario ya no existe.' };
    if (actual.id === actor.id) {
      return { ok: false, error: 'Para tu propia cuenta usa «Cambiar mi contraseña» en el menú de tu nombre.' };
    }
    const contrasenaTemporal = generarContrasenaTemporal();
    try {
      await this.repo.setPasswordHash(id, await hashContrasena(contrasenaTemporal));
    } catch (e) {
      registrarFallo('restablecer contraseña', e);
      return { ok: false, error: 'No se ha podido crear la contraseña nueva. Vuelve a intentarlo.' };
    }
    registrar(actor.id, 'restablecer-contrasena', id);
    return { ok: true, data: { cuenta: actual, contrasenaTemporal } };
  }

  /** Cualquier rol, sobre su propia cuenta. */
  async cambiarMiContrasena(
    actor: ActorCuenta | null,
    raw: { actual?: unknown; nueva?: unknown; repetir?: unknown },
  ): Promise<SaveResult<true>> {
    if (!actor) return { ok: false, error: 'Tu sesión ha caducado. Vuelve a entrar.' };
    const actual = typeof raw.actual === 'string' ? raw.actual : '';
    const nueva = typeof raw.nueva === 'string' ? raw.nueva : '';
    const repetir = typeof raw.repetir === 'string' ? raw.repetir : '';
    const fieldErrors: Record<string, string> = {};
    if (!actual) fieldErrors.actual = 'Escribe tu contraseña actual';
    if (nueva.length < MIN_CONTRASENA) fieldErrors.nueva = `Usa al menos ${MIN_CONTRASENA} caracteres`;
    else if (Buffer.byteLength(nueva, 'utf8') > MAX_BYTES_CONTRASENA) {
      fieldErrors.nueva = 'Es demasiado larga: usa como máximo unos 70 caracteres (menos si lleva acentos o emojis)';
    }
    else if (nueva === actual) fieldErrors.nueva = 'Tiene que ser distinta de la actual';
    if (!fieldErrors.nueva && repetir !== nueva) fieldErrors.repetir = 'No coincide con la nueva contraseña';
    if (Object.keys(fieldErrors).length) return { ok: false, error: 'Revisa los campos marcados', fieldErrors };

    try {
      const hash = await this.repo.getPasswordHash(actor.id);
      if (!hash || !(await compararContrasena(actual, hash))) {
        return { ok: false, error: 'Revisa los campos marcados', fieldErrors: { actual: 'La contraseña actual no es correcta' } };
      }
      await this.repo.setPasswordHash(actor.id, await hashContrasena(nueva));
    } catch (e) {
      registrarFallo('cambiar mi contraseña', e);
      return { ok: false, error: 'No se ha podido cambiar la contraseña. Vuelve a intentarlo.' };
    }
    registrar(actor.id, 'cambiar-mi-contrasena', actor.id);
    return { ok: true, data: true };
  }
}
