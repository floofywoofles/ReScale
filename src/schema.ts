/**
 * CLI argument schema using Zod.
 *
 * Ensures strictly valid inputs for the upscaler CLI and provides
 * typed inference across the codebase.
 */
import zod from "zod";
import resolutions from "./resolutions.ts";

/**
 * Accepted CLI parameters.
 * - image: path to an input image file
 * - resolution: target size as one of the supported WxH presets
 * - output: destination file path for the processed image
 * - debug: enable verbose logging
 * - batch: toggle processing multiple files (future use)
 */
const schema = zod.object({
    image: zod.string(),
    resolution: zod.enum(resolutions),
    output: zod.string(),
    debug: zod.boolean().optional().default(false),
    batch: zod.boolean().optional().default(false),
});

export default schema;