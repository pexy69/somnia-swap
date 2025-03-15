import ora from "ora";
import { ethers } from "ethers";
import fs from "fs";
import { generateUserAgent } from "./helpers.js"; // Import fungsi User-Agent

// 🎨 Menampilkan Banner Pexy Swap Bot + Somnia AutoSwap
console.log(`
         █████  ███    ██      ██ ███████ ███    ██  ██████  ██ 
        ██   ██ ████   ██      ██ ██      ████   ██ ██       ██ 
        ███████ ██ ██  ██      ██ █████   ██ ██  ██ ██   ███ ██ 
        ██   ██ ██  ██ ██ ██   ██ ██      ██  ██ ██ ██    ██    
        ██   ██ ██   ████  █████  ███████ ██   ████  ██████  ██ 
                                                            
                🚀 Bot started! Created by: Pexy 
                  
                🔄 Running: Somnia AutoSwap 
                🏆 Github : https://github.com/pexy69  
`);

// Animasi loading sebelum bot mulai
const spinner = ora({
    text: "🔄 Initializing bot...",
    spinner: "dots",
}).start();

const initBot = async () => {
    try {
        // Cek apakah file config.json ada
        if (!fs.existsSync("config.json")) {
            throw new Error("File config.json tidak ditemukan!");
        }

        // Membaca konfigurasi dari config.json
        const config = JSON.parse(fs.readFileSync("config.json", "utf-8"));

        // Validasi konfigurasi yang wajib ada
        if (!config.RPC_URL || !config.PRIVATE_KEY || !config.tokenIn || !config.tokenOut || !config.swapAmount || !config.loopInterval) {
            throw new Error("Config.json tidak lengkap! Pastikan semua parameter tersedia.");
        }

        // Inisialisasi provider tanpa User-Agent karena tidak didukung oleh ethers
        const provider = new ethers.JsonRpcProvider(config.RPC_URL);
        const wallet = new ethers.Wallet(config.PRIVATE_KEY, provider);

        // Tampilkan User-Agent yang sedang digunakan
        console.log(`🌍 Using User-Agent: ${generateUserAgent()}`);

        const routerAddress = "0x6AAC14f090A35EeA150705f72D90E4CDC4a49b2C"; // Router address
        const erc20Abi = ["function approve(address spender, uint256 amount) public returns (bool)"];
        const routerAbi = [
            "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external returns (uint256)"
        ];

        // Fungsi validasi alamat token
        const isValidAddress = (address) => ethers.isAddress(address);

        // Fungsi untuk melakukan approval token
        const approveToken = async (tokenAddress, amount) => {
            try {
                const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, wallet);
                const tx = await tokenContract.approve(routerAddress, ethers.parseUnits(amount.toString(), 18));
                console.log(`✅ Approval token ${tokenAddress} berhasil! 🔗 Tx Hash: ${tx.hash}`);
                await tx.wait();
            } catch (error) {
                console.error("❌ Approval gagal:", error);
                return false;
            }
            return true;
        };

        // Fungsi untuk melakukan swap
        const swapTokens = async (tokenIn, tokenOut, amountIn) => {
            try {
                if (!isValidAddress(tokenIn) || !isValidAddress(tokenOut)) {
                    console.error("❌ Alamat token tidak valid:", { tokenIn, tokenOut });
                    return;
                }

                // Lakukan approval sebelum swap
                const approved = await approveToken(tokenIn, amountIn);
                if (!approved) return;

                const router = new ethers.Contract(routerAddress, routerAbi, wallet);
                const gasPrice = (await provider.getFeeData()).gasPrice;

                const params = {
                    tokenIn,
                    tokenOut,
                    fee: 500,
                    recipient: wallet.address,
                    amountIn: ethers.parseUnits(amountIn.toString(), 18),
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                };

                console.log(`🔄 Swap ${tokenIn} ➝ ${tokenOut} | Amount: ${amountIn}`);
                const tx = await router.exactInputSingle(params, {
                    gasLimit: 300000,
                    gasPrice: gasPrice
                });

                console.log(`✅ Swap berhasil! 🔗 Tx Hash: ${tx.hash}`);
                await tx.wait();
            } catch (error) {
                console.error("❌ Swap gagal:", error);
            }
        };

        // Fungsi loop swap
        const swapLoop = async () => {
            while (true) {
                try {
                    await swapTokens(config.tokenIn, config.tokenOut, config.swapAmount);
                    await new Promise(resolve => setTimeout(resolve, config.loopInterval));
                    await swapTokens(config.tokenOut, config.tokenIn, config.swapAmount);
                    await new Promise(resolve => setTimeout(resolve, config.loopInterval));
                } catch (error) {
                    console.error("❌ Terjadi kesalahan di loop utama:", error);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        };

        spinner.succeed("✅ Bot successfully started!");
        swapLoop();

    } catch (error) {
        spinner.fail("❌ Bot failed to start!");
        console.error("Error:", error);
        process.exit(1);
    }
};

// Menjalankan bot setelah delay 2 detik
setTimeout(initBot, 2000);
