// Brush drawing binds raw GL programs between p5 image operations. Rebind p5's program instead of
// trusting its cached _curShader, which can refer to a program the brush renderer has displaced.
// The compatibility shim stays in the project; installed packages are unchanged.
(() => {
  const useProgram=p5.Shader.prototype.useProgram;
  p5.Shader.prototype.useProgram=function(...args){
    this._renderer._curShader=null;
    return useProgram.apply(this,args);
  };
})();
