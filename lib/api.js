export function apiErrorMessage(error) {
  const message = String(error?.message || error || "");
  if (/DATABASE_URL|Environment variable not found|Can't reach database server|connection.*(refused|closed)|does not exist|relation .* does not exist|P1001|P1000|P1012|P2021/i.test(message)) {
    return "The database is not ready. Add a PostgreSQL DATABASE_URL in Vercel and redeploy so the tables can be created.";
  }
  return process.env.NODE_ENV === "production" ? "Something went wrong on the server. Please try again." : message || "Something went wrong.";
}

export function withApi(handler) {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("API error:", error);
      return Response.json({ error: apiErrorMessage(error) }, { status: 500 });
    }
  };
}
