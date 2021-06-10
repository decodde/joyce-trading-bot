var htmls = {
    loader : {
        1 :`<div class="gui-ne-loader-hold"><div class="gui-ne-loader-container-1"><div class="gui-ne-loader gui-ne-anim-blink"></div><div class="gui-ne-loader gui-ne-anim-blink-delay-1"></div><div class="gui-ne-loader gui-ne-anim-blink-delay-2"></div><div class="gui-ne-loader gui-ne-anim-blink-delay-3"></div><div class="gui-ne-loader gui-ne-anim-blink-delay-4"></div></div></div>`,
        2 : `<div class="gui-ne-loader-hold"><div class="gui-ne-loader-container"><div class="gui-ne-loader-circle gui-ne-anim-blink-delay-2"><div class="gui-ne-loader-circle gui-ne-anim-blink-delay-3"><div class="gui-ne-loader-circle gui-ne-anim-blink-delay-4"><div class="gui-ne-loader-circle gui-ne-anim-blink-delay-3"><div class="gui-ne-loader-circle gui-ne-anim-blink-delay-2"></div></div></div></div></div></div></div>`
    }
}

class guiNe {
    constructor(){
        
    }
    pop () {
         
    }
    loader = {
        show : (id,time) => {
            var x = document.body.getElementsByTagName("gn-loader");
            id ? "" : id = 1;
            if (x.length < 1){
                if(time){
                    setTimeout(this.loader.close,time)
                }
                var l = document.createElement("gn-loader");
                l.innerHTML = htmls.loader[id];
                document.body.append(l);
            }
            else {
                this.loader.close();
                this.loader.show();
            }
        },
        close : () => {
            var x = document.body.getElementsByTagName("gn-loader");
            if (x.length > 0) {
                x[0].remove();
            }
            else this.log("No gn-loader found");
        }
    }
    log (msg) {
        console.log(`>> GUI-NE >>>>>>>>>> \n  :=> ${msg}`);
    }
}