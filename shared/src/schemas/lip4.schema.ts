import { z } from "zod";

export const Lip4Schema = z.object({
  project_type: z.literal("LIP_4"),
  project_name: z.string().min(1, "Project name is required"),
  project_customer: z.string().min(1, "Customer is required"),
  dbms: z.enum(["oracle", "mysql", "mariadb", "postgres"]),
  project_directory: z.string().default("project"),
  deployment: z.enum(["none", "deploy"]).default("none"),
  deployment_name: z.string().optional(),
  build_image_name: z.string().optional(),
  notification_failure_email: z.string().email("Invalid email").optional().or(z.literal('')),
})
.refine((data) => {
    // conditional logic: deployment_name is required if deployment == 'deploy'
    if (data.deployment === 'deploy' && !data.deployment_name) {
        return false;
    }
    return true;
}, {
    message: "deployment_name is required when deployment is 'deploy'",
    path: ["deployment_name"]
})
.transform((data) => {
    // Centralized fallback logic for build_image_name. Docker requires image names to be fully lowercase.
    return {
        ...data,
        build_image_name: (data.build_image_name || data.deployment_name || data.project_name).toLowerCase()
    };
});

export type Lip4Payload = z.infer<typeof Lip4Schema>;
