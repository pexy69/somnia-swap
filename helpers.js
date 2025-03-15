import { UAParser } from "ua-parser-js";

export const generateUserAgent = () => {
    const parser = new UAParser();

    // List OS & Browser yang umum digunakan
    const osList = ["Windows", "Mac OS", "Linux", "Android", "iOS"];
    const browserList = ["Chrome", "Firefox", "Edge", "Safari", "Opera"];

    // Pilih OS & Browser secara acak
    const os = osList[Math.floor(Math.random() * osList.length)];
    const browser = browserList[Math.floor(Math.random() * browserList.length)];

    // Atur User-Agent berdasarkan OS & Browser yang dipilih
    parser.setUA(`${browser} on ${os}`);

    return parser.getUA(); // Mengembalikan User-Agent yang valid
};
