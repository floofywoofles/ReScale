/**
 * Supported output resolutions in WxH format.
 *
 * These presets power strict validation via Zod's `enum` and ensure that
 * only known-good target sizes are permitted by the CLI.
 */
const resolutions: string[] = [
    // 🟦 Standard Definition
    "320x240",
    "640x480",
    "800x600",

    // 🟩 High Definition (HD)
    "1024x768",
    "1280x720",
    "1280x800",
    "1366x768",

    // 🟨 Full High Definition
    "1600x900",
    "1920x1080",

    // 🟧 Quad High Definition (2K class)
    "2048x1080",
    "2560x1080",
    "2560x1440",
    "3440x1440",
    "3840x1600",

    // 🟥 Ultra High Definition (4K)
    "3840x2160",
    "4096x2160",
    "5120x2160",
    "5120x2880",

    // 🟪 6K
    "6016x3384",
    "6144x3160",

    // 🟫 8K
    "7680x4320",
    "8192x4320"
];

export default resolutions;