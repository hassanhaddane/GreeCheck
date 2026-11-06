/** Use a provisioned geocoder. The public Nominatim instance is not a production default. */
export function configuredGeocoder(): URL | undefined {
  try {
    const value = process.env.NOMINATIM_API_URL;
    if (!value) return undefined;
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password ||
        url.hostname.toLowerCase().replace(/\.$/, "") === "nominatim.openstreetmap.org") return undefined;
    return url;
  } catch {
    return undefined;
  }
}
