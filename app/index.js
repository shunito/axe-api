// Shunsuke Ito
const path = require('path');
const crypto = require('crypto');

const cors = require('cors');
const fastify = require('fastify')({logger: true});
const puppeteer = require('puppeteer');

let aXeCore = require('./node_modules/axe-core/axe.js');
const axios = require('axios');

let results = {};

function md5Hex( src ) {
    let hash = crypto.createHash('md5');

    hash.update(src, 'utf8');
    return hash.digest('hex');
}

const checkPage = async ( url, locale ) => {
    let result = {};
    let md5 = md5Hex( url );

    if( locale === 'jp' ){
        aXeCore = require('./node_modules/axe-core/axe.ja.js');
    }
    else if( locale === 'nl' ){
        aXeCore = require('./node_modules/axe-core/axe.nl.js');
    }

    console.log( locale );

    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox','--disable-dev-shm-usage']
        });

        const page = await browser.newPage();
        page.on('load', () => console.log('Page loaded!'));
        page.on('error', (error) => console.log(error));

        await page.setViewport({ width: 1200, height: 800 });
        await page.goto( url );

        await page.addScriptTag({ content: aXeCore.source });
        result = await page.evaluate( async () => {
            return await axe.run( document );
        });

        const filename = [
            md5,
            new Date().getTime() + '.png'
        ].join('-');

        console.log('screenshot::', filename );
        result.screenshot = filename;

        await page.screenshot({ 
            path: path.join('/app/static/screenshot/', filename),
            fullPage: true });
        
        await browser.close();
        return result;
    } catch (err) {
        return {err};
    }
};

const checkStatus = async ( url ) => {
    try {
        return axios.head( url )
        .then(function(response) {
            return response.status;
        })
        .catch(function(error) {
            console.log( error );
            return false;
        });
    } 
    catch (err) {
        return false;
    }
};

const checkURL = async ( url, locale ) => {
    let result = {};

    try {
        const status = await checkStatus( url );
        if( status === 200 ){
            result = {
                status : status,
                result : await checkPage( url, locale )
            };
        }
        else{
            result = { status : status };
        }
        return result;
    } 
    catch (err) {
        return { status: false, err };
    }
};


// Server Setting
fastify.use(cors());
fastify.register(require('fastify-formbody'));

// Static pages
fastify.register(require('fastify-static'), {
    root: path.join(__dirname, 'static')
});

// Check aXe 
fastify.post('/check', (request, reply) => {
    const body = request.body; 
    const url = body.url;
    const locale = body.locale;

    if( url ){
        fastify.log.info( 'check start URL: ' + url );
        (async () => {
            results = await checkURL( url, locale );

            fastify.log.info( 'check reply: ' + url );
            reply.type('application/json').code(200);
            reply.send( results );
        })();
    } else {
        fastify.log.error( 'check error : URL not found' );
        reply.type('application/json').code(200);
        reply.send( results );
    }
});

fastify.listen(3000, '0.0.0.0', function (err) {
    if (err) {
        fastify.log.error(err)
        throw err
    }

    console.log(`server listening on ${fastify.server.address().port}`)
});

fastify.ready().then(() => {
    console.log('successfully booted!')
}, (err) => {
    console.log('an error happened', err)
});