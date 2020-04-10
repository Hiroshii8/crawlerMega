const fs = require("fs");
const cheerio = require('cheerio');
const baseURL = "http://www.bankmega.com/promolainnya.php";
const base = "http://www.bankmega.com";
const reqPromise = require('request-promise');
const {URL} = require('url');
const Promise = require('bluebird');

async function crawlData() {
    // get category for first init
    var arr_category = await getCategories();
    // category data should be arranged by the category
    var categoryData = await promiseCategoryData(arr_category);

    // combine the data and form into an object
    var combinedData = combineData(arr_category, categoryData);
    return combinedData;
}

async function combineData(arr_category, categoryData) {
    let combine = {};
    for (let i=0; i<arr_category.length; i++) {
        combine[arr_category[i].title] = categoryData[i];
    }
    return combine;
}


async function promiseCategoryData(arr_category){
    var result = []
    for (var i=1; i<=arr_category.length; i++) {
        console.log("Crawl Data " + arr_category[i-1].title)
        result.push(getCategoryData(i))
    }
    return Promise.all(result).then(function(data) {
        return data;
    })
}

async function getCategoryData(subcat){
    var urlLink = baseURL+"?subcat="+subcat
    var resArr = await reqPromise(urlLink).then(async function(html) {
        var $ = cheerio.load(html);
        let res = $("#paging1")
        var maxPage = 1;
        if (res) {
            try {
                let splt = res.attr('title').split(' ')[3]
                maxPage = parseInt(splt)
            } catch (error) {
                maxPage = 1;
            }
        }
        var result = []
        for (let currPage = 1; currPage <= maxPage; currPage++) {
            // request till the end of page
            var rp = await requestCategoryData(urlLink+"&page="+currPage)
            // get the detail information in every data
            for (let i=0; i<rp.length; i++) {
                var detail = await getDetail(rp[i].url)
                var info = {}
                info.Title = rp[i].title;
                info.ImageUrl = rp[i].imageUrl;
                info.Url = rp[i].url;                
                if (detail.hasOwnProperty("des_img"))
                    info.DescImageUrL = detail.des_img;
                if (detail.hasOwnProperty("start"))
                    info.StartPeriod = detail.start;
                if (detail.hasOwnProperty("end"))
                    info.EndPeriod = detail.end;
                result.push(info)
            }
        }
        return result;
    });
    return resArr;
}

async function getDetail(urlLink){
    return reqPromise(urlLink).then(async function(html) {
        var $ = cheerio.load(html);
        var detail = {}
        let ImageUrl = $('#contentpromolain2 .keteranganinside img').attr('src');
        let area = $('#contentpromolain2 > .area').text().replace('Area Promo : ', '');
        let time = $('#contentpromolain2 > .periode').text().replace(/\t|\n/g, '').replace('Periode Promo : ', '');
        if (area) {
            detail.area = area;
        } 
        if (time) {
            var [startPeriod, endPeriod] = time.split(' - ');
            if (startPeriod) {
                detail.start = startPeriod;
            } 
            if (endPeriod) {
                detail.end = endPeriod;
            }
        }
        if (ImageUrl) {
            detail.des_img = new URL(ImageUrl, base).toString();
        }
        return detail;
    }).catch((err) => {
        return {};
    })
}

async function getCategories(){
    // get all of the category by mapping all the response
    return reqPromise(baseURL).then((html) => {
        var $ = cheerio.load(html);
        return $('div[id="subcatpromo"]> div > img').map((i, res) => res.attribs).get()
    })
}

async function requestCategoryData(link){
    return reqPromise(link).then(async function(html){
        var $ = cheerio.load(html);
        return $('#promolain LI A').map((i, el) => {
            var link = $(el).attr('href')
            var img = $(el).children();
            return {
                title: img.attr("title"),
                imageUrl : new URL(img.attr("src"), base).toString(),
                url: new URL(link, base).toString()
            };
        }).get();
    })
}

crawlData().then((result) => {
    console.log("Crawling Process Done")
    console.log("Convert into JSON")
    jsonObj = JSON.stringify(result, null, 2);
    fs.writeFile("./solution.json", jsonObj, (err) => {
        if (err) {
            console.log(err)
            return
        }
        console.log("Done Crawling Data");
    })
}).catch((err) => {
    console.log(err)
})
