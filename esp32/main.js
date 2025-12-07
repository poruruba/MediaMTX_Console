import * as camera from "Camera";
import * as utils from "Utils";
import * as udp from "Udp";

console.log("main.js start");
console.log(JSON.stringify(esp32.getMemoryUsage()));

camera.start(camera.MODEL_M5STACK_V2_PSRAM, camera.FRAMESIZE_VGA);
console.log(JSON.stringify(camera.getParameter()));

udp.recvBegin(1234);

function loop(){
	esp32.update();
	
	var recv = udp.checkRecvText();
	if( recv ){
		try{
			console.log("recvText");
			console.log(JSON.stringify(recv));
			var target = JSON.parse(recv.payload);
			console.log(JSON.stringify(target));

			var buffer = camera.getPicture();
			var base64 = utils.base64Encode(new Uint8Array(buffer));
			console.log(base64.length);

			var step = 512;
			for( var index = 0 ; index < base64.length ; index += step ){
				var subtext = base64.substr(index, step )
				udp.sendText(target.ipaddress, target.port, subtext);
//				console.log(subtext);
			}
			udp.sendText(target.ipaddress, target.port, "\n");
			console.log('udpSend called');
		}catch(error){
			console.error(error);
		}
	}
}
