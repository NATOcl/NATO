/**
 * URLs configurables en tiempo de build.
 *
 * En GitHub Pages el CV es estático: AlbumVault y la API siguen viviendo en
 * Render. El workflow de Pages define estas variables con la URL pública.
 * En Render y en desarrollo se usan las rutas relativas del mismo servidor.
 */
const env = import.meta.env || {};

export const albumVaultUrl = env.VITE_ALBUMVAULT_URL || "/albumvault/";

export const projectsApiUrl = env.VITE_PROJECTS_API_URL || "/api/projects";
