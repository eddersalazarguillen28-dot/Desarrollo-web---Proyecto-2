document.addEventListener('DOMContentLoaded',() =>{
    cambiarTema();

})

function cambiarTema(){
    const btnTema = document.getElementById('btn-toggle-theme');
    const htmlElement = document.documentElement;

    const savedTheme = localStorage.getItem('octoerp_theme')||'light';
    htmlElement.setAttribute('data-theme',savedTheme);

    if (btnTema){
        btnTema.addEventListener('click', () => {
            const currentTheme =htmlElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' :'light';
            htmlElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('octoerp_theme',newTheme);
        })
    }

}

//TENTACULOS PULPO

document.addEventListener("DOMContentLoaded",() => {
    const canvas = document.getElementById("tentacles-canvas");
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    let width=(canvas.width= canvas.parentElement.clientWidth);
    let height=(canvas.height = canvas.parentElement.clientHeight);

    window.addEventListener("resize",()=>{
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = canvas.parentElement.clientHeight;

    });

    class Tentacle{
        constructor(x,y,length,segments,baseWidth,angleOffset,speed){
            this.x=x;
            this.y = y;
            this.length = length;
            this.segments= segments;
            this.baseWidth=baseWidth;
            this.angleOffset = angleOffset;
            this.speed = speed;
            this.angle = 0;
        }

        update(time){
            this.angle = Math.sin(time * this.speed + this.angleOffset)*0.4;
        }

        draw(time){
            ctx.save();
            ctx.translate(this.x,this.y);

            let pointsLeft = [];
            let pointsRight= [];
            let currentAngle = this.angleOffset;
            let cx = 0;
            let cy = 0;

            const segmentLen = this.length / this.segments;

            for(let i = 0; i<=this.segments;i++){
                const progress = i/this.segments;
                const wave = Math.sin(time*this.speed + i*0.3+this.angleOffset)*0.35*(progress+0.1);
                currentAngle = -Math.PI/2 + wave;

                const currentWidth = this.baseWidth * (1-progress*0.85);
                
                const nx = Math.cos(currentAngle + Math.PI/2) * (currentWidth/2);
                const ny = Math.sin(currentAngle+Math.PI/2) * (currentWidth/2);

                pointsLeft.push({x: cx-nx, y: cy-ny});
                pointsRight.push({x: cx+nx, y: cy+ny});

                if(i < this.segments){
                    cx += Math.cos(currentAngle)*segmentLen;
                    cy += Math.sin(currentAngle)*segmentLen;
                }




            }

            const gradient = ctx.createLinearGradient(0,0,cx,cy);
            gradient.addColorStop(0,"rgba(108,92,231,0.45)");
            gradient.addColorStop(0.5,"rgba(139,119,255,0.35)");
            gradient.addColorStop(1,"rgba(108,92,231,0.05)");

            ctx.beginPath();
            ctx.moveTo(pointsLeft[0].x,pointsLeft[0].y);

            for(let i = 1; i<pointsLeft.length;i++){
                ctx.lineTo(pointsLeft[i].x, pointsLeft[i].y);
            }

            for(let i=pointsRight.length-1;i>=0;i--){
                ctx.lineTo(pointsRight[i].x, pointsRight[i].y);
            }

            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.shadowBlur = 15;
            ctx.shadowColor = "rgba(108,92,231,0.5)";
            ctx.fill();

            ctx.fillStyle = "rgba(255,255,255,0.4)";
            for(let i = 2; i<pointsRight.length-2; i+=2){
                const pt = pointsRight[i];
                const r = (1-i / pointsRight.length)*3+1;
                ctx.beginPath();
                ctx.arc(pt.x,pt.y,r,0,Math.PI*2);
                ctx.fill();
            }

            ctx.restore();



        }
    }

    //config tentaculos

    const tentacles=[
        new Tentacle (width * 0.68, height + 20,320,25,28,0,0.0018),
        new Tentacle (width * 0.78, height + 20,380,28,34,1.2,0.0015),
        new Tentacle (width * 0.88, height + 20,300,22,24,2.5,0.0022),
        new Tentacle (width * 0.96, height + 20,350,25,30,4.0,0.0017),
        new Tentacle (width + 10, height * 0.6,280,20,22,0.8,0.002)

    ];

    function animate(time){
        ctx.clearRect(0,0,width,height);

        tentacles.forEach(tentacle=>{
            tentacle.update(time);
            tentacle.draw(time);
        });
        
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
        

    
})