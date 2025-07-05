// api/gemini-proxy.js
export default async function handler(req, res) {
    res.status(200).json({ message: "Vercel function is active!" });
}