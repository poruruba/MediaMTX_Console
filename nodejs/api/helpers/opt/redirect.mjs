export default class Redirect{
    constructor(url){
        this.statusCode = 302;
        this.headers = {'Location' : url};
        this.body = null;
    }
}
