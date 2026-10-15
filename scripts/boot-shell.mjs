// This first, small fragment can paint while the rest of the HTML is streaming.
export const bootStyle=`<style>
html,body{margin:0;background:#e3f8f4;color:#39675c;font-family:system-ui,sans-serif}body{min-height:100vh}
.splash{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;background:linear-gradient(#93e1e7,#e8fbf0);text-align:center;padding:24px;box-sizing:border-box}
.splash[hidden]{display:none!important}.splash h2{margin:18px 0 8px;font-size:26px}.splash p{font-size:14px;line-height:1.7}
.splash .brand-mark{display:grid;place-items:center;width:60px;height:60px;background:#86bc53;border:3px solid #fff5c9;border-radius:18px;color:#fff;font-size:40px;font-weight:900;box-shadow:0 4px #548747;position:relative}.splash .brand-mark span{position:absolute;right:-7px;top:-16px;font-size:22px;color:#ffe469}
.loading-dots{display:flex;gap:7px;margin:16px}.loading-dots i{width:9px;height:9px;border-radius:50%;background:#6baf62;animation:boot-pulse 1s infinite alternate}.loading-dots i:nth-child(2){animation-delay:.2s}.loading-dots i:nth-child(3){animation-delay:.4s}
.boot-retry{border:2px solid #fff6ca;background:#ffca56;color:#65471c;border-radius:14px;padding:10px 24px;font-size:16px;font-weight:700;cursor:pointer}.boot-retry[hidden]{display:none}
@keyframes boot-pulse{to{opacity:.3;transform:translateY(-5px)}}
</style>`;
export const bootScript=`<script>
window.WORD_POP_BOOT={started:Date.now(),ready:false};
setTimeout(function(){if(window.WORD_POP_BOOT.ready)return;var message=document.getElementById('bootMessage'),retry=document.getElementById('bootRetry');if(message)message.textContent='网络较慢，正在继续加载。若长时间没有变化，请重新加载。';if(retry)retry.hidden=false;},8000);
window.addEventListener('error',function(event){if(window.WORD_POP_BOOT.ready||event.target!==window)return;var message=document.getElementById('bootMessage'),retry=document.getElementById('bootRetry');if(message)message.textContent='页面未能完成加载，请重试。';if(retry)retry.hidden=false;});
</script>`;
