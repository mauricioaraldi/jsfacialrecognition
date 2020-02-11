import Koa from 'koa';
import koaStatic from 'koa-static';

const app = new Koa();

app.use(koaStatic('./pages'));
app.use(koaStatic('./static'));
app.use(koaStatic('./models'));
app.use(koaStatic('./users_photos'));

app.listen(3000);