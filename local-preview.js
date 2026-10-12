/* Local HTML cannot launch the Worker: provide an actionable preview entry. */
if(location.protocol==='file:'){
 const notice=document.createElement('div');
 notice.setAttribute('role','alert');
 notice.style.cssText='position:relative;z-index:99;background:#fff2d5;color:#503c17;padding:18px 24px;font:14px/1.8 system-ui;border-bottom:1px solid #e6d4a3';
 notice.textContent='本地预览：请解压完整项目包，在项目文件夹中运行 python3 tools/preview.py。浏览器会自动打开可运行的页面；直接双击 HTML 无法启动数学引擎。';
 document.body.prepend(notice);
}
