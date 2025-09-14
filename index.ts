/**
 * ReScale (Bun)
 *
 * Description:
 * - Upscales an input image to a specified resolution using Sharp.
 * - Displays a console progress bar while processing.
 * - Writes the upscaled image to the provided output path.
 *
 * Inputs (CLI args via minimist):
 * - --image <string>: Path to the input image file (required)
 * - --resolution <string>: Target resolution in WxH (e.g., 1920x1080) (required)
 * - --output <string>: Path to write the upscaled image (required)
 *
 * Environment Variables:
 * - DEBUG: When set to "true", prints parsed arguments for troubleshooting.
 */
import zod, { ZodError } from "zod"; // Runtime argument validation and friendly error messaging
import minimist from "minimist"; // Lightweight CLI args parser
import sharp from "sharp"; // High-performance image processing
import { upscaleImage, saveImage } from "./src/rescale.ts"; // Upscaler functions
import schema from "./src/schema.ts";

// Parse raw CLI arguments once at the beginning
const args = minimist(process.argv.slice(2));


// Basic presence checks to fail fast with actionable messages
if (!args.image) {
    throw new Error("Image is required. Use --image <image> to specify the image to upscale.");
}

if (!args.resolution) {
    throw new Error("Resolution is required. Use --resolution <resolution> to specify the resolution to upscale to.");
}

if (!args.output) {
    throw new Error("Output is required. Use --output <output> to specify the output file.");
}

// Strongly validate and constrain arguments with Zod to avoid ambiguous states
// TODO: add more resolutions and allow for custom resolutions




// Keep a typed and validated view of CLI args
let parsedArgs: zod.infer<typeof schema>;

try {
    // Parse and validate; throws with context on failure
    parsedArgs = schema.parse(args);
    process.env.DEBUG = parsedArgs.debug.toString();
} catch (error: unknown) {
    // Normalize Zod errors to human-friendly messages; rethrow unknown errors untouched
    if (!(error instanceof ZodError)) {
        throw error;
    }
    const zodError = error as ZodError;
    if (zodError.issues.length === 0) {
        throw new Error(`[UPSCALER] Invalid arguments: ${zodError.message}`);
    }
    throw new Error(`[UPSCALER] Invalid arguments: ${zodError.issues.map((issue) => issue.message).join(", ")}`);
}

// Optional debug printout to aid troubleshooting without impacting normal output
// Use sharp to upscale image
if (process.env.DEBUG === "true") {
    console.log(`[UPSCALER] Parsed arguments: ${JSON.stringify(parsedArgs)}`);
}
// Initialize Sharp with the input image
const image = sharp(parsedArgs.image);
// Will hold the processed output ready to be written

try {
    const upscaledImage = await upscaleImage(image, parsedArgs.resolution, parsedArgs);
    if (!upscaledImage) {
        throw new Error(`[UPSCALER] Failed to resize image. Might be undefined`);
    }
    const savedImage = await saveImage(upscaledImage, parsedArgs.output, parsedArgs);
    if (process.env.DEBUG === "true") {
        console.log(`[UPSCALER] Image upscaled and written to ${parsedArgs.output}`)
    }
} catch (error) {
    throw new Error(`[UPSCALER] Failed to process image: ${error}`);
}
