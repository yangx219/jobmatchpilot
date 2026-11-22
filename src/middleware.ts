import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    // Health checks must remain anonymous so Docker and load balancers can
    // determine readiness before any user session exists. MCP authenticates
    // with its own bearer token rather than an Auth.js session.
    "/api/((?!auth|mcp|health).*)",
  ],
};
