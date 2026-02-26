function renderFooter(){
  const host = document.getElementById("vv-footer");
  if(!host) return;
  const year = new Date().getFullYear();
  host.innerHTML = `
    <div class="vv-container vv-footer">
      © ${year} Velvet Vault — Keep the lights low. Follow the green signal.
    </div>
  `;
}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded", renderFooter, {once:true});
}else{
  renderFooter();
}
