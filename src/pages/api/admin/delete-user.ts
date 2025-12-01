import type { APIRoute } from "astro";
import { adminAuth, adminDb } from "../../../firebase/admin";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { userId, adminToken } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Se requiere el ID del usuario",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!adminToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Se requiere token de autenticación",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    // Verificar que el token es válido y el usuario es admin
    try {
      const decodedToken = await adminAuth.verifyIdToken(adminToken);
      const adminUid = decodedToken.uid;

      // Verificar que el usuario que hace la petición es admin
      const adminDoc = await adminDb.collection("users").doc(adminUid).get();

      if (!adminDoc.exists || adminDoc.data()?.role !== "admin") {
        return new Response(
          JSON.stringify({
            success: false,
            error: "No tienes permisos de administrador",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }

      // Prevenir que un admin se elimine a sí mismo
      if (userId === adminUid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "No puedes eliminarte a ti mismo",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Token inválido o expirado" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    // Eliminar usuario de Firebase Authentication
    try {
      await adminAuth.deleteUser(userId);
    } catch (authError: unknown) {
      const error = authError as { code?: string; message?: string };
      // Si el usuario no existe en Auth, continuar con la eliminación de Firestore
      if (error.code !== "auth/user-not-found") {
        console.error("Error eliminando usuario de Auth:", error);
        return new Response(
          JSON.stringify({
            success: false,
            error: `Error al eliminar de Authentication: ${error.message || "Error desconocido"}`,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    // Eliminar documento de Firestore
    try {
      await adminDb.collection("users").doc(userId).delete();
    } catch (firestoreError: unknown) {
      const error = firestoreError as { message?: string };
      console.error("Error eliminando documento de Firestore:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Usuario eliminado de Auth pero error en Firestore: ${error.message || "Error desconocido"}`,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message:
          "Usuario eliminado completamente de Authentication y Firestore",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("Error en delete-user API:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "Error interno del servidor",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
