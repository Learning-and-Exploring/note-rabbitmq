export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const query = getQuery(event);
  const authId = typeof query.authId === "string" ? query.authId : "";
  const endpoint = authId
    ? `/notes/auth/${encodeURIComponent(authId)}`
    : "/notes";

  return await $fetch(`${config.public.noteServiceBase}${endpoint}`, {
    method: "GET",
  });
});
