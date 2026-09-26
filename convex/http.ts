import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Wires up Convex Auth's own HTTP routes (sign-in, sign-out, etc.)
auth.addHttpRoutes(http);

export default http;
