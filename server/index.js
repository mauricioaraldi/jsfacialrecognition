import Koa from 'koa';
import koaStatic from 'koa-static';
import koaBodyParser from 'koa-bodyparser';
import fs from 'fs';
import * as canvas from 'canvas';
import * as faceapi from 'face-api.js';
import '@tensorflow/tfjs-node';

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const app = new Koa();

app.use(koaStatic('./pages'));
app.use(koaStatic('./static'));
app.use(koaStatic('./models'));
app.use(koaStatic('./users_photos'));
app.use(koaBodyParser());

app.use(({request, res, url}) => {
  if (url === '/recognize') {
    const image = request.body.image.replace(/^data:image\/png;base64,/, "");
    const filePath = `${__dirname}/../users_photos/example.png`;
    const savedImage = fs.readFileSync(filePath, 'base64');

    res.statusCode = 200;
    res.write(JSON.stringify({user: false}));
    res.end();
  } else if (url === '/newuser') {
    const name = request.body.name.replace(/ /g, '');
    const image = request.body.image.replace(/^data:image\/png;base64,/, "");
    const filePath = `${__dirname}/../users_photos/${name}.png`;
    let isFileSaved = false;

    fs.writeFileSync(filePath, image,
      {
        encoding: 'base64',
        flag: 'w'
      }
    );

    try {
      fs.accessSync(filePath);
      isFileSaved = true;
    } catch (e) {
      isFileSaved = false;
    }

    res.statusCode = 200;
    res.write(JSON.stringify({
      user: isFileSaved ? request.body.name : false
    }));
    res.end();
  }
});

app.listen(3000);