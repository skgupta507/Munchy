const axios = require("axios");
const { load } = require("cheerio");
const express = require("express");
const { ANIME } = require("@consumet/extensions");
const { getSource, encode } = require("../utils");
const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const data = [];
        const body = await (await axios.get(`https://anitaku.so/home.html`)).data
        const $ = load(body);
        $("#load_recent_release .last_episodes ul li").each((i, e) => {
            data.push({
                id: $(e).find(".img a").attr("href").slice(1).split("-episode-")[0],
                epid: $(e).find(".img a").attr("href").slice(1),
                title: $(e).find(".img a").attr("title"),
                cover: $(e).find(".img a img").attr("src"),
                episode: $(e).find("p.episode").text()
            });
        });
        const site = {
            title: "Munchy",
            description: "Discover your new favorite anime on Munchy now! we offer a vast library of high-quality content, accessible on multiple devices and without any interruptions."
        }
        res.render("index", { data, site });
    } catch (error) {
        res.render("error");
        console.error(error);
    }
});

router.get("/season/this/:page", async (req, res) => {
    try {
        const data = [];
        const body = await (await axios.get(`https://anitaku.so/new-season.html?page=${req.params.page}`)).data
        const $ = load(body);
        const current = $(`section.content_left .anime_name .anime_name_pagination 
        .pagination ul.pagination-list li.selected a`).text().trim();
        const total = $(`section.content_left .anime_name .anime_name_pagination 
        .pagination ul.pagination-list li:last a`).text().trim();
        const pagination = {
            currentPage: current ? parseInt(current) : null,
            totalPages: total ? parseInt(total) : null,
            hasNext: parseInt(current) < parseInt(total)
        }
        $("section.content_left .last_episodes ul li").each((i, e) => {
            data.push({
                id: $(e).find(".img a").attr("href").slice(10),
                title: $(e).find(".img a").attr("title"),
                cover: $(e).find(".img a img").attr("src"),
                released: $(e).find("p.released").text().trim()
            });
        });
        const site = {
            title: "This Season",
            description: "Discover your new favorite anime on Munchy now! we offer a vast library of high-quality content, accessible on multiple devices and without any interruptions."
        }
        res.render("season", { pagination, data, site });
    } catch (error) {
        res.render("error");
        console.error(error);
    }
});

router.get("/search", async (req, res) => {
    try {
        const { q } = req.query;
        if (q) {
            res.redirect(`/search/${encodeURIComponent(q)}`);
        }
        const data = [];
        const scrap = async (page) => {
            const body = await (await axios.get(`https://ajax.gogocdn.net/ajax/page-recent-release-ongoing.html?page=${page}`)).data
            const $ = load(body);
            $(".added_series_body ul li").each((i, e) => {
                data.push({
                    id: $(e).find("a:nth-child(1)").attr("href").slice(10),
                    epid: $(e).find("p:last a").attr("href").slice(1),
                    title: $(e).find("a:nth-child(1)").attr("title"),
                    cover: $(e).find("a:nth-child(1) .thumbnail-popular").attr("style").match(/url\('([^']+)'\)/)[1],
                    episode: $(e).find("p:last a").text().trim()
                });
            });
        }
        for (const page of Array(2)) {
            await scrap(page);
        }
        const site = {
            title: "Search",
            description: "Discover your new favorite anime on Munchy now! we offer a vast library of high-quality content, accessible on multiple devices and without any interruptions."
        }
        res.render("search", { data, site });
    } catch (error) {
        res.render("error");
        console.error(error);
    }
});

router.get("/search/:q", async (req, res) => {
    try {
        const data = []
        const request = await new ANIME.Gogoanime().search(req.params.q);
        if (request.results.length > 0) {
            request.results.map((i) => {
                data.push({
                    id: i.id,
                    title: i.title,
                    cover: i.image,
                    released: i.releaseDate
                });
            });
        }
        const site = {
            title: "Search Result",
            description: "Discover your new favorite anime on Munchy now! we offer a vast library of high-quality content, accessible on multiple devices and without any interruptions."
        }
        res.render("result", { data, site });
    } catch (error) {
        res.render("error");
        console.error(error);
    }
});

router.get("/info/:id", async (req, res) => {
    try {
        const body = await (await axios.get(`https://anitaku.so/category/${req.params.id}`)).data
        const $ = load(body);
        const genres = [];
        $(".anime_info_body_bg p.type:last").prev().prev().prev().find("a").each((i, e) => {
            genres.push($(e).attr("title"))
        });

        const start = $("#episode_page > li").first().find("a").attr("ep_start");
        const end = $("#episode_page > li").last().find("a").attr("ep_end");
        const movie = $("#movie_id").attr("value");
        const alias = $("#alias_anime").attr("value");
        const epurl = "https://ajax.gogocdn.net/ajax/load-list-episode"
        const eps = (await axios.get(`${epurl}?ep_start=${start}&ep_end=${end}&id=${movie}&default_ep=${0}&alias=${alias}`))
            .data
        const $$ = load(eps);
        const episodes = [];
        $$("#episode_related > li").each((i, e) => {
            episodes.push({
                id: $(e).find("a").attr("href").split("/")[1],
                episode: $(e).find("div.name").text().replace("EP ", ""),
            });
        });

        const data = {
            id: req.params.id,
            title: $(".anime_info_body_bg h1").text(),
            cover: $(".anime_info_body_bg img").attr("src"),
            synopsis: $(".anime_info_body_bg .description").text().trim(),
            genres: genres,
            released: parseInt($(".anime_info_body_bg p.type:last").prev().prev().text().replace("Released: ", "")),
            status: $(".anime_info_body_bg p.type:last").prev().find("a").text(),
            episodes: episodes
        }
        const site = {
            title: data.title,
            description: "Discover your new favorite anime on Munchy now! we offer a vast library of high-quality content, accessible on multiple devices and without any interruptions."
        }
        res.render("info", { data, site });
    } catch (error) {
        res.render("error");
        console.error(error);
    }
});

router.get("/episode/:id/:episode", async (req, res) => {
    try {
        const request = await getSource(req.params.episode);
        const data = {
            episode: {
                id: request.info.id,
                title: request.info.title,
                episode: "Episode " + request.info.episode
            },
            source: request.sources[0].url,
            plyr: `https://plyr.link/p/player.html#${encode(request.sources[0].url)}`,
            nspl: `https://nspl.nyt92.eu.org/player?p=${encode(`file=${request.sources[0].url}`)}`
        }
        const body = await (await axios.get(`https://anitaku.so/category/${req.params.id}`)).data
        const $ = load(body);
        const genres = [];
        $(".anime_info_body_bg p.type:last").prev().prev().prev().find("a").each((i, e) => {
            genres.push($(e).attr("title"))
        });

        const start = $("#episode_page > li").first().find("a").attr("ep_start");
        const end = $("#episode_page > li").last().find("a").attr("ep_end");
        const movie = $("#movie_id").attr("value");
        const alias = $("#alias_anime").attr("value");
        const epurl = "https://ajax.gogocdn.net/ajax/load-list-episode"
        const eps = (await axios.get(`${epurl}?ep_start=${start}&ep_end=${end}&id=${movie}&default_ep=${0}&alias=${alias}`))
            .data
        const $$ = load(eps);
        const episodes = [];
        $$("#episode_related > li").each((i, e) => {
            episodes.push({
                id: $(e).find("a").attr("href").split("/")[1],
                episode: $(e).find("div.name").text().replace("EP ", ""),
            });
        });

        const info = {
            id: req.params.id,
            title: $(".anime_info_body_bg h1").text(),
            cover: $(".anime_info_body_bg img").attr("src"),
            synopsis: $(".anime_info_body_bg .description").text().trim(),
            genres: genres,
            released: parseInt($(".anime_info_body_bg p.type:last").prev().prev().text().replace("Released: ", "")),
            status: $(".anime_info_body_bg p.type:last").prev().find("a").text(),
            episodes: episodes
        }
        const site = {
            title: `Watching ${data.episode.episode} of ${data.episode.title}`,
            description: "Discover your new favorite anime on Munchy now! we offer a vast library of high-quality content, accessible on multiple devices and without any interruptions."
        }
        res.render("stream", { data, info, site });
    } catch (error) {
        res.render("error");
        console.error(error);
    }
});

router.get("*", (req, res) => {
    const site = {
        title: "Error Occurred",
        description: "Discover your new favorite anime on Munchy now! we offer a vast library of high-quality content, accessible on multiple devices and without any interruptions."
    }
    res.render("error", { site });
});

module.exports = router