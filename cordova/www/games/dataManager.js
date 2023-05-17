/**
 * Here we have a special class to keep the token and retrieve it easily and we got the local/aws adress
 *
 *
 * @author Weel BEN AISSA
 * @author Mourad KARRAKCHOU
 * @author Ayoub IMAMI
 */



//To switch between local and aws, just change the address variable
const local = "http://localhost:80";
const aws = "http://4quarts.connect4.academy:80";
const brut = "http://15.236.190.187:80";
export const address = local;
export const ioAddress = (address === brut || address === aws) ? "ws://15.236.190.187" : "ws://localhost";
export var token;

export function findToken(){
    let cookies = document.cookie.split(';');
    console.log(cookies);
    for (let i = 0; i < cookies.length; i++) {
        if (cookies[i].trim().startsWith("token=")) {
            token = cookies[i].trim().substring("token=".length, cookies[i].trim().length);
            break;
        }
    }
}
