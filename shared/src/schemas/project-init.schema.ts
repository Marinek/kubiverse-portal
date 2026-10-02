import { z } from "zod";
import { Lip4Schema } from "./lip4.schema";

// Future schemas can be imported here and formed into a z.union or z.discriminatedUnion (e.g. Lip5Schema)
export const ProjectInitSchema = Lip4Schema;

export type ProjectInitPayload = z.infer<typeof ProjectInitSchema>;
