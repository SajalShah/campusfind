/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "duzybzrpnabciwvnfpqi.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // @xenova/transformers loads its ONNX runtime native binary
  // (libonnxruntime.so) dynamically at runtime rather than via a normal
  // import, so Vercel's automatic file tracer doesn't detect it and
  // leaves it out of the deployed function bundle. These two settings
  // fix that: keep the package un-bundled (so it's a real node_modules
  // require at runtime) and explicitly include its native binary files.
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-node"],
  outputFileTracingIncludes: {
    "/api/match": ["./node_modules/onnxruntime-node/bin/**/*"],
    "/api/embed": ["./node_modules/onnxruntime-node/bin/**/*"],
  },
};

export default nextConfig;
