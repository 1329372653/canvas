var canvas = document.getElementById("canvas");
		var ctx = canvas.getContext("2d");

		ctx.strokeStyle = '#00ffff';
		ctx.lineWidth = 17;
		ctx.shadowBlur= 15;
		ctx.shadowColor = '#00ffff'

		function degToRad(degree){
			var factor = Math.PI/180;
			return degree*factor;
		}

		function renderTime(){
			var now = new Date();
			var today = now.toDateString();
			var time = now.toLocaleTimeString();
			var hrs = now.getHours();
			var min = now.getMinutes();
			var sec = now.getSeconds();
			var mil = now.getMilliseconds();
			var smoothsec = sec+(mil/1000);
      var smoothmin = min+(smoothsec/60);

			//Background
			gradient = ctx.createRadialGradient(250, 250, 5, 250, 250, 300);
			gradient.addColorStop(0, "#03303a");
			gradient.addColorStop(1, "black");
			ctx.fillStyle = gradient;
			//ctx.fillStyle = 'rgba(00 ,00 , 00, 1)';
			ctx.fillRect(0, 0, 500, 500);
			//Hours
			ctx.beginPath();
			ctx.arc(250,250,200, degToRad(270), degToRad((hrs*30)-90));
			ctx.stroke();
			//Minutes
			ctx.beginPath();
			ctx.arc(250,250,170, degToRad(270), degToRad((smoothmin*6)-90));
			ctx.stroke();
			//Seconds
			ctx.beginPath();
			ctx.arc(250,250,140, degToRad(270), degToRad((smoothsec*6)-90));
			ctx.stroke();
			//Date
			ctx.font = "25px Helvetica";
			ctx.fillStyle = 'rgba(00, 255, 255, 1)'
			ctx.fillText(today, 175, 250);
			//Time
			ctx.font = "25px Helvetica Bold";
			ctx.fillStyle = 'rgba(00, 255, 255, 1)';
			ctx.fillText(time+":"+mil, 175, 280);

		}
		setInterval(renderTime, 40);