export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "id is required" });
  }

  return await $fetch(
    `${config.public.noteServiceBase}/notes/${encodeURIComponent(id)}`,
    {
      method: "GET",
    },
  );
});
