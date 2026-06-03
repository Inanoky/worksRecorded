export function getMetaGraphVersion() {
  return process.env.META_GRAPH_API_VERSION || "v18.0";
}

export function getMetaGraphBaseUrl() {
  return `https://graph.facebook.com/${getMetaGraphVersion()}`;
}
