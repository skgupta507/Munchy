const axios = require("axios");
const { load } = require("cheerio");
const crypto = require("crypto-js");

const encode = (source) => {
    return crypto.enc.Base64.stringify(crypto.enc.Utf8.parse(source));
}

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36";
const keys = {
    key: crypto.enc.Utf8.parse("37911490979715163134003223491201"),
    secondKey: crypto.enc.Utf8.parse("54674138327930866480207815084989"),
    iv: crypto.enc.Utf8.parse("3134003223491201")
}

let referer = ""

const getSource = async (id) => {
    let datapg
    try {
        const datapage = (await axios.get(`https://anitaku.so/${id}`, { headers: { "User-Agent": USER_AGENT } })).data
        datapg = datapage
    } catch (error) {
        if (error.response) {
            return {
                code: error.response.status || 500,
                message: error.message
            }
        }
        throw error
    }
    const x$ = load(datapg);
    const title = x$(".anime_video_body_cate > .anime-info > a").attr("title");
    const ani_id = x$(".anime_video_body_cate > .anime-info > a").attr("href").replace("/category/", "");
    const server = x$("#load_anime > div > div > iframe").attr("src");
    const videoUrl = new URL(server);
    referer = videoUrl.href
    const res = await axios.get(videoUrl.href, { headers: { "User-Agent": USER_AGENT } });
    const $ = load(res.data);

    const iframeUrls = [];
    $("#list-server-more > ul > li").each((index, element) => {
        const videoUrl = $(element).attr("data-video");
        iframeUrls.push({
            name: $(element).text(),
            iframe: videoUrl
        });
    });


    if (!iframeUrls.some(item => item.name.includes("Vidstreaming"))) {
        return {
            info: {
                title,
                id: ani_id,
                episode: ani_id.split("-episode-")[1]
            },
            sources: null,
            tracks: "",
            iframe: iframeUrls
        }
    }

    const encyptedParams = await generateEncryptedAjaxParams(
        $, videoUrl.searchParams.get("id") ?? ""
    );

    const encryptedData = await axios.get(
        `${videoUrl.protocol}//${videoUrl.hostname}/encrypt-ajax.php?${encyptedParams}`,
        { headers: { "X-Requested-With": "XMLHttpRequest" } }
    );

    const decryptedData = await decryptAjaxData(encryptedData.data.data);
    if (!decryptedData.source)
        throw new Error("No source found. Try a different server.");

    let sources = [];
    decryptedData.source.forEach((source) => {
        sources.push({
            url: source.file,
            isM3U8: source.file.includes(".m3u8"),
            quality: "default"
        });
    });

    decryptedData.source_bk.forEach((source) => {
        sources.push({
            url: source.file,
            isM3U8: source.file.includes(".m3u8"),
            quality: "backup"
        });
    });

    return {
        info: {
            title,
            id: ani_id,
            episode: id.split("-episode-")[1],
        },
        sources: sources,
        tracks: decryptedData?.track.tracks,
        iframe: iframeUrls.slice(1)
    }
}

const generateEncryptedAjaxParams = async ($, id) => {
    const encryptedKey = crypto.AES.encrypt(id, keys.key, { iv: keys.iv });
    const scriptValue = $("script[data-name='episode']").data().value;
    const decryptedToken = crypto.AES.decrypt(scriptValue, keys.key, { iv: keys.iv }).toString(crypto.enc.Utf8);
    return `id=${encryptedKey}&alias=${id}&${decryptedToken}`;
};

const decryptAjaxData = async (encryptedData) => {
    const decryptedData = crypto.enc.Utf8.stringify(crypto.AES.decrypt(encryptedData, keys.secondKey, { iv: keys.iv }));
    return JSON.parse(decryptedData);
}

module.exports = { getSource, encode }