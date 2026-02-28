var vH="183",Q8={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},$8={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},hH=0,GZ=1,xH=2,sU=3,iU=0,e7=1,gH=2,M7=3,L7=0,nJ=1,z9=2,I9=0,J6=1,NZ=2,qZ=3,EZ=4,pH=5,oU=6,V7=100,mH=101,dH=102,lH=103,uH=104,cH=200,nH=201,sH=202,iH=203,oH=204,aH=205,rH=206,tH=207,eH=208,JY=209,QY=210,$Y=211,ZY=212,WY=213,KY=214,HY=0,YY=1,XY=2,FZ=3,UY=4,GY=5,NY=6,qY=7,EY=0,FY=1,DY=2,q9=0,DZ=1,OZ=2,RZ=3,kZ=4,MZ=5,LZ=6,VZ=7,aU="attached",rU="detached",tU=300,B7=301,T8=302,kQ=303,MQ=304,Q6=306,OY=1000,LQ=1001,RY=1002,Z8=1003,kY=1004,eU=1004,$6=1005,JG=1005,sJ=1006,VQ=1007,QG=1007,S8=1008,$G=1008,E9=1009,MY=1010,LY=1011,Z6=1012,BZ=1013,W8=1014,g9=1015,p9=1016,zZ=1017,IZ=1018,z7=1020,VY=35902,BY=35899,zY=1021,IY=1022,C9=1023,j8=1026,y8=1027,CY=1028,CZ=1029,I7=1030,wZ=1031,ZG=1032,AZ=1033,BQ=33776,zQ=33777,IQ=33778,CQ=33779,_Z=35840,PZ=35841,TZ=35842,SZ=35843,jZ=36196,yZ=37492,fZ=37496,bZ=37488,vZ=37489,hZ=37490,xZ=37491,gZ=37808,pZ=37809,mZ=37810,dZ=37811,lZ=37812,uZ=37813,cZ=37814,nZ=37815,sZ=37816,iZ=37817,oZ=37818,aZ=37819,rZ=37820,tZ=37821,eZ=36492,JW=36494,QW=36495,$W=36283,ZW=36284,WW=36285,KW=36286,WG=2200,KG=2201,HG=2202,YG=2300,XG=2301,UG=2302,GG=2303,NG=2400,qG=2401,EG=2402,FG=2500,DG=2501,OG=0,RG=1,kG=2,MG=3200,LG=3201,VG=3202,BG=3203,wY=0,AY=1,f8="",_Y="srgb",W6="srgb-linear",HW="linear",EJ="srgb",zG="",IG="rg",CG="ga",wG=0,AG=7680,_G=7681,PG=7682,TG=7683,SG=34055,jG=34056,yG=5386,fG=512,bG=513,vG=514,hG=515,xG=516,gG=517,pG=518,mG=519,PY=512,TY=513,SY=514,wQ=515,jY=516,yY=517,AQ=518,fY=519,dG=35044,lG=35048,uG=35040,cG=35045,nG=35049,sG=35041,iG=35046,oG=35050,aG=35042,rG="100",YW="300 es",XW=2000,tG=2001,eG={COMPUTE:"compute",RENDER:"render"},J5={PERSPECTIVE:"perspective",LINEAR:"linear",FLAT:"flat"},Q5={NORMAL:"normal",CENTROID:"centroid",SAMPLE:"sample",FIRST:"first",EITHER:"either"},$5={TEXTURE_COMPARE:"depthTextureCompare"};function Z5(J){for(let Q=J.length-1;Q>=0;--Q)if(J[Q]>=65535)return!0;return!1}var W5={Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array};function N7(J,Q){return new W5[J](Q)}function bY(J){return ArrayBuffer.isView(J)&&!(J instanceof DataView)}function E7(J){return document.createElementNS("http://www.w3.org/1999/xhtml",J)}function vY(){let J=E7("canvas");return J.style.display="block",J}var PK={},J8=null;function K5(J){J8=J}function H5(){return J8}function s7(...J){let Q="THREE."+J.shift();if(J8)J8("log",Q,...J);else console.log(Q,...J)}function hY(J){let Q=J[0];if(typeof Q==="string"&&Q.startsWith("TSL:")){let $=J[1];if($&&$.isStackTrace)J[0]+=" "+$.getLocation();else J[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return J}function q0(...J){J=hY(J);let Q="THREE."+J.shift();if(J8)J8("warn",Q,...J);else{let $=J[0];if($&&$.isStackTrace)console.warn($.getError(Q));else console.warn(Q,...J)}}function j0(...J){J=hY(J);let Q="THREE."+J.shift();if(J8)J8("error",Q,...J);else{let $=J[0];if($&&$.isStackTrace)console.error($.getError(Q));else console.error(Q,...J)}}function i7(...J){let Q=J.join(" ");if(Q in PK)return;PK[Q]=!0,q0(...J)}function xY(J,Q,$){return new Promise(function(Z,W){function K(){switch(J.clientWaitSync(Q,J.SYNC_FLUSH_COMMANDS_BIT,0)){case J.WAIT_FAILED:W();break;case J.TIMEOUT_EXPIRED:setTimeout(K,$);break;default:Z()}}setTimeout(K,$)})}var gY={[0]:1,[2]:6,[4]:7,[3]:5,[1]:0,[6]:2,[7]:4,[5]:3};class F9{addEventListener(J,Q){if(this._listeners===void 0)this._listeners={};let $=this._listeners;if($[J]===void 0)$[J]=[];if($[J].indexOf(Q)===-1)$[J].push(Q)}hasEventListener(J,Q){let $=this._listeners;if($===void 0)return!1;return $[J]!==void 0&&$[J].indexOf(Q)!==-1}removeEventListener(J,Q){let $=this._listeners;if($===void 0)return;let Z=$[J];if(Z!==void 0){let W=Z.indexOf(Q);if(W!==-1)Z.splice(W,1)}}dispatchEvent(J){let Q=this._listeners;if(Q===void 0)return;let $=Q[J.type];if($!==void 0){J.target=this;let Z=$.slice(0);for(let W=0,K=Z.length;W<K;W++)Z[W].call(this,J);J.target=null}}}var bJ=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],TK=1234567,C8=Math.PI/180,w8=180/Math.PI;function eJ(){let J=Math.random()*4294967295|0,Q=Math.random()*4294967295|0,$=Math.random()*4294967295|0,Z=Math.random()*4294967295|0;return(bJ[J&255]+bJ[J>>8&255]+bJ[J>>16&255]+bJ[J>>24&255]+"-"+bJ[Q&255]+bJ[Q>>8&255]+"-"+bJ[Q>>16&15|64]+bJ[Q>>24&255]+"-"+bJ[$&63|128]+bJ[$>>8&255]+"-"+bJ[$>>16&255]+bJ[$>>24&255]+bJ[Z&255]+bJ[Z>>8&255]+bJ[Z>>16&255]+bJ[Z>>24&255]).toLowerCase()}function p0(J,Q,$){return Math.max(Q,Math.min($,J))}function UW(J,Q){return(J%Q+Q)%Q}function Y5(J,Q,$,Z,W){return Z+(J-Q)*(W-Z)/($-Q)}function X5(J,Q,$){if(J!==Q)return($-J)/(Q-J);else return 0}function u7(J,Q,$){return(1-$)*J+$*Q}function U5(J,Q,$,Z){return u7(J,Q,1-Math.exp(-$*Z))}function G5(J,Q=1){return Q-Math.abs(UW(J,Q*2)-Q)}function N5(J,Q,$){if(J<=Q)return 0;if(J>=$)return 1;return J=(J-Q)/($-Q),J*J*(3-2*J)}function q5(J,Q,$){if(J<=Q)return 0;if(J>=$)return 1;return J=(J-Q)/($-Q),J*J*J*(J*(J*6-15)+10)}function E5(J,Q){return J+Math.floor(Math.random()*(Q-J+1))}function F5(J,Q){return J+Math.random()*(Q-J)}function D5(J){return J*(0.5-Math.random())}function O5(J){if(J!==void 0)TK=J;let Q=TK+=1831565813;return Q=Math.imul(Q^Q>>>15,Q|1),Q^=Q+Math.imul(Q^Q>>>7,Q|61),((Q^Q>>>14)>>>0)/4294967296}function R5(J){return J*C8}function k5(J){return J*w8}function M5(J){return(J&J-1)===0&&J!==0}function L5(J){return Math.pow(2,Math.ceil(Math.log(J)/Math.LN2))}function V5(J){return Math.pow(2,Math.floor(Math.log(J)/Math.LN2))}function B5(J,Q,$,Z,W){let{cos:K,sin:H}=Math,Y=K($/2),X=H($/2),U=K((Q+Z)/2),N=H((Q+Z)/2),q=K((Q-Z)/2),G=H((Q-Z)/2),E=K((Z-Q)/2),O=H((Z-Q)/2);switch(W){case"XYX":J.set(Y*N,X*q,X*G,Y*U);break;case"YZY":J.set(X*G,Y*N,X*q,Y*U);break;case"ZXZ":J.set(X*q,X*G,Y*N,Y*U);break;case"XZX":J.set(Y*N,X*O,X*E,Y*U);break;case"YXY":J.set(X*E,Y*N,X*O,Y*U);break;case"ZYZ":J.set(X*O,X*E,Y*N,Y*U);break;default:q0("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+W)}}function mJ(J,Q){switch(Q.constructor){case Float32Array:return J;case Uint32Array:return J/4294967295;case Uint16Array:return J/65535;case Uint8Array:return J/255;case Int32Array:return Math.max(J/2147483647,-1);case Int16Array:return Math.max(J/32767,-1);case Int8Array:return Math.max(J/127,-1);default:throw Error("Invalid component type.")}}function o0(J,Q){switch(Q.constructor){case Float32Array:return J;case Uint32Array:return Math.round(J*4294967295);case Uint16Array:return Math.round(J*65535);case Uint8Array:return Math.round(J*255);case Int32Array:return Math.round(J*2147483647);case Int16Array:return Math.round(J*32767);case Int8Array:return Math.round(J*127);default:throw Error("Invalid component type.")}}var GW={DEG2RAD:C8,RAD2DEG:w8,generateUUID:eJ,clamp:p0,euclideanModulo:UW,mapLinear:Y5,inverseLerp:X5,lerp:u7,damp:U5,pingpong:G5,smoothstep:N5,smootherstep:q5,randInt:E5,randFloat:F5,randFloatSpread:D5,seededRandom:O5,degToRad:R5,radToDeg:k5,isPowerOfTwo:M5,ceilPowerOfTwo:L5,floorPowerOfTwo:V5,setQuaternionFromProperEuler:B5,normalize:o0,denormalize:mJ};class s{constructor(J=0,Q=0){s.prototype.isVector2=!0,this.x=J,this.y=Q}get width(){return this.x}set width(J){this.x=J}get height(){return this.y}set height(J){this.y=J}set(J,Q){return this.x=J,this.y=Q,this}setScalar(J){return this.x=J,this.y=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setComponent(J,Q){switch(J){case 0:this.x=Q;break;case 1:this.y=Q;break;default:throw Error("index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;default:throw Error("index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y)}copy(J){return this.x=J.x,this.y=J.y,this}add(J){return this.x+=J.x,this.y+=J.y,this}addScalar(J){return this.x+=J,this.y+=J,this}addVectors(J,Q){return this.x=J.x+Q.x,this.y=J.y+Q.y,this}addScaledVector(J,Q){return this.x+=J.x*Q,this.y+=J.y*Q,this}sub(J){return this.x-=J.x,this.y-=J.y,this}subScalar(J){return this.x-=J,this.y-=J,this}subVectors(J,Q){return this.x=J.x-Q.x,this.y=J.y-Q.y,this}multiply(J){return this.x*=J.x,this.y*=J.y,this}multiplyScalar(J){return this.x*=J,this.y*=J,this}divide(J){return this.x/=J.x,this.y/=J.y,this}divideScalar(J){return this.multiplyScalar(1/J)}applyMatrix3(J){let Q=this.x,$=this.y,Z=J.elements;return this.x=Z[0]*Q+Z[3]*$+Z[6],this.y=Z[1]*Q+Z[4]*$+Z[7],this}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this}clamp(J,Q){return this.x=p0(this.x,J.x,Q.x),this.y=p0(this.y,J.y,Q.y),this}clampScalar(J,Q){return this.x=p0(this.x,J,Q),this.y=p0(this.y,J,Q),this}clampLength(J,Q){let $=this.length();return this.divideScalar($||1).multiplyScalar(p0($,J,Q))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(J){return this.x*J.x+this.y*J.y}cross(J){return this.x*J.y-this.y*J.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(J){let Q=Math.sqrt(this.lengthSq()*J.lengthSq());if(Q===0)return Math.PI/2;let $=this.dot(J)/Q;return Math.acos(p0($,-1,1))}distanceTo(J){return Math.sqrt(this.distanceToSquared(J))}distanceToSquared(J){let Q=this.x-J.x,$=this.y-J.y;return Q*Q+$*$}manhattanDistanceTo(J){return Math.abs(this.x-J.x)+Math.abs(this.y-J.y)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,Q){return this.x+=(J.x-this.x)*Q,this.y+=(J.y-this.y)*Q,this}lerpVectors(J,Q,$){return this.x=J.x+(Q.x-J.x)*$,this.y=J.y+(Q.y-J.y)*$,this}equals(J){return J.x===this.x&&J.y===this.y}fromArray(J,Q=0){return this.x=J[Q],this.y=J[Q+1],this}toArray(J=[],Q=0){return J[Q]=this.x,J[Q+1]=this.y,J}fromBufferAttribute(J,Q){return this.x=J.getX(Q),this.y=J.getY(Q),this}rotateAround(J,Q){let $=Math.cos(Q),Z=Math.sin(Q),W=this.x-J.x,K=this.y-J.y;return this.x=W*$-K*Z+J.x,this.y=W*Z+K*$+J.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class zJ{constructor(J=0,Q=0,$=0,Z=1){this.isQuaternion=!0,this._x=J,this._y=Q,this._z=$,this._w=Z}static slerpFlat(J,Q,$,Z,W,K,H){let Y=$[Z+0],X=$[Z+1],U=$[Z+2],N=$[Z+3],q=W[K+0],G=W[K+1],E=W[K+2],O=W[K+3];if(N!==O||Y!==q||X!==G||U!==E){let R=Y*q+X*G+U*E+N*O;if(R<0)q=-q,G=-G,E=-E,O=-O,R=-R;let D=1-H;if(R<0.9995){let F=Math.acos(R),M=Math.sin(F);D=Math.sin(D*F)/M,H=Math.sin(H*F)/M,Y=Y*D+q*H,X=X*D+G*H,U=U*D+E*H,N=N*D+O*H}else{Y=Y*D+q*H,X=X*D+G*H,U=U*D+E*H,N=N*D+O*H;let F=1/Math.sqrt(Y*Y+X*X+U*U+N*N);Y*=F,X*=F,U*=F,N*=F}}J[Q]=Y,J[Q+1]=X,J[Q+2]=U,J[Q+3]=N}static multiplyQuaternionsFlat(J,Q,$,Z,W,K){let H=$[Z],Y=$[Z+1],X=$[Z+2],U=$[Z+3],N=W[K],q=W[K+1],G=W[K+2],E=W[K+3];return J[Q]=H*E+U*N+Y*G-X*q,J[Q+1]=Y*E+U*q+X*N-H*G,J[Q+2]=X*E+U*G+H*q-Y*N,J[Q+3]=U*E-H*N-Y*q-X*G,J}get x(){return this._x}set x(J){this._x=J,this._onChangeCallback()}get y(){return this._y}set y(J){this._y=J,this._onChangeCallback()}get z(){return this._z}set z(J){this._z=J,this._onChangeCallback()}get w(){return this._w}set w(J){this._w=J,this._onChangeCallback()}set(J,Q,$,Z){return this._x=J,this._y=Q,this._z=$,this._w=Z,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(J){return this._x=J.x,this._y=J.y,this._z=J.z,this._w=J.w,this._onChangeCallback(),this}setFromEuler(J,Q=!0){let{_x:$,_y:Z,_z:W,_order:K}=J,H=Math.cos,Y=Math.sin,X=H($/2),U=H(Z/2),N=H(W/2),q=Y($/2),G=Y(Z/2),E=Y(W/2);switch(K){case"XYZ":this._x=q*U*N+X*G*E,this._y=X*G*N-q*U*E,this._z=X*U*E+q*G*N,this._w=X*U*N-q*G*E;break;case"YXZ":this._x=q*U*N+X*G*E,this._y=X*G*N-q*U*E,this._z=X*U*E-q*G*N,this._w=X*U*N+q*G*E;break;case"ZXY":this._x=q*U*N-X*G*E,this._y=X*G*N+q*U*E,this._z=X*U*E+q*G*N,this._w=X*U*N-q*G*E;break;case"ZYX":this._x=q*U*N-X*G*E,this._y=X*G*N+q*U*E,this._z=X*U*E-q*G*N,this._w=X*U*N+q*G*E;break;case"YZX":this._x=q*U*N+X*G*E,this._y=X*G*N+q*U*E,this._z=X*U*E-q*G*N,this._w=X*U*N-q*G*E;break;case"XZY":this._x=q*U*N-X*G*E,this._y=X*G*N-q*U*E,this._z=X*U*E+q*G*N,this._w=X*U*N+q*G*E;break;default:q0("Quaternion: .setFromEuler() encountered an unknown order: "+K)}if(Q===!0)this._onChangeCallback();return this}setFromAxisAngle(J,Q){let $=Q/2,Z=Math.sin($);return this._x=J.x*Z,this._y=J.y*Z,this._z=J.z*Z,this._w=Math.cos($),this._onChangeCallback(),this}setFromRotationMatrix(J){let Q=J.elements,$=Q[0],Z=Q[4],W=Q[8],K=Q[1],H=Q[5],Y=Q[9],X=Q[2],U=Q[6],N=Q[10],q=$+H+N;if(q>0){let G=0.5/Math.sqrt(q+1);this._w=0.25/G,this._x=(U-Y)*G,this._y=(W-X)*G,this._z=(K-Z)*G}else if($>H&&$>N){let G=2*Math.sqrt(1+$-H-N);this._w=(U-Y)/G,this._x=0.25*G,this._y=(Z+K)/G,this._z=(W+X)/G}else if(H>N){let G=2*Math.sqrt(1+H-$-N);this._w=(W-X)/G,this._x=(Z+K)/G,this._y=0.25*G,this._z=(Y+U)/G}else{let G=2*Math.sqrt(1+N-$-H);this._w=(K-Z)/G,this._x=(W+X)/G,this._y=(Y+U)/G,this._z=0.25*G}return this._onChangeCallback(),this}setFromUnitVectors(J,Q){let $=J.dot(Q)+1;if($<0.00000001)if($=0,Math.abs(J.x)>Math.abs(J.z))this._x=-J.y,this._y=J.x,this._z=0,this._w=$;else this._x=0,this._y=-J.z,this._z=J.y,this._w=$;else this._x=J.y*Q.z-J.z*Q.y,this._y=J.z*Q.x-J.x*Q.z,this._z=J.x*Q.y-J.y*Q.x,this._w=$;return this.normalize()}angleTo(J){return 2*Math.acos(Math.abs(p0(this.dot(J),-1,1)))}rotateTowards(J,Q){let $=this.angleTo(J);if($===0)return this;let Z=Math.min(1,Q/$);return this.slerp(J,Z),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(J){return this._x*J._x+this._y*J._y+this._z*J._z+this._w*J._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let J=this.length();if(J===0)this._x=0,this._y=0,this._z=0,this._w=1;else J=1/J,this._x=this._x*J,this._y=this._y*J,this._z=this._z*J,this._w=this._w*J;return this._onChangeCallback(),this}multiply(J){return this.multiplyQuaternions(this,J)}premultiply(J){return this.multiplyQuaternions(J,this)}multiplyQuaternions(J,Q){let{_x:$,_y:Z,_z:W,_w:K}=J,H=Q._x,Y=Q._y,X=Q._z,U=Q._w;return this._x=$*U+K*H+Z*X-W*Y,this._y=Z*U+K*Y+W*H-$*X,this._z=W*U+K*X+$*Y-Z*H,this._w=K*U-$*H-Z*Y-W*X,this._onChangeCallback(),this}slerp(J,Q){let{_x:$,_y:Z,_z:W,_w:K}=J,H=this.dot(J);if(H<0)$=-$,Z=-Z,W=-W,K=-K,H=-H;let Y=1-Q;if(H<0.9995){let X=Math.acos(H),U=Math.sin(X);Y=Math.sin(Y*X)/U,Q=Math.sin(Q*X)/U,this._x=this._x*Y+$*Q,this._y=this._y*Y+Z*Q,this._z=this._z*Y+W*Q,this._w=this._w*Y+K*Q,this._onChangeCallback()}else this._x=this._x*Y+$*Q,this._y=this._y*Y+Z*Q,this._z=this._z*Y+W*Q,this._w=this._w*Y+K*Q,this.normalize();return this}slerpQuaternions(J,Q,$){return this.copy(J).slerp(Q,$)}random(){let J=2*Math.PI*Math.random(),Q=2*Math.PI*Math.random(),$=Math.random(),Z=Math.sqrt(1-$),W=Math.sqrt($);return this.set(Z*Math.sin(J),Z*Math.cos(J),W*Math.sin(Q),W*Math.cos(Q))}equals(J){return J._x===this._x&&J._y===this._y&&J._z===this._z&&J._w===this._w}fromArray(J,Q=0){return this._x=J[Q],this._y=J[Q+1],this._z=J[Q+2],this._w=J[Q+3],this._onChangeCallback(),this}toArray(J=[],Q=0){return J[Q]=this._x,J[Q+1]=this._y,J[Q+2]=this._z,J[Q+3]=this._w,J}fromBufferAttribute(J,Q){return this._x=J.getX(Q),this._y=J.getY(Q),this._z=J.getZ(Q),this._w=J.getW(Q),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(J){return this._onChangeCallback=J,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class _{constructor(J=0,Q=0,$=0){_.prototype.isVector3=!0,this.x=J,this.y=Q,this.z=$}set(J,Q,$){if($===void 0)$=this.z;return this.x=J,this.y=Q,this.z=$,this}setScalar(J){return this.x=J,this.y=J,this.z=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setZ(J){return this.z=J,this}setComponent(J,Q){switch(J){case 0:this.x=Q;break;case 1:this.y=Q;break;case 2:this.z=Q;break;default:throw Error("index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error("index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(J){return this.x=J.x,this.y=J.y,this.z=J.z,this}add(J){return this.x+=J.x,this.y+=J.y,this.z+=J.z,this}addScalar(J){return this.x+=J,this.y+=J,this.z+=J,this}addVectors(J,Q){return this.x=J.x+Q.x,this.y=J.y+Q.y,this.z=J.z+Q.z,this}addScaledVector(J,Q){return this.x+=J.x*Q,this.y+=J.y*Q,this.z+=J.z*Q,this}sub(J){return this.x-=J.x,this.y-=J.y,this.z-=J.z,this}subScalar(J){return this.x-=J,this.y-=J,this.z-=J,this}subVectors(J,Q){return this.x=J.x-Q.x,this.y=J.y-Q.y,this.z=J.z-Q.z,this}multiply(J){return this.x*=J.x,this.y*=J.y,this.z*=J.z,this}multiplyScalar(J){return this.x*=J,this.y*=J,this.z*=J,this}multiplyVectors(J,Q){return this.x=J.x*Q.x,this.y=J.y*Q.y,this.z=J.z*Q.z,this}applyEuler(J){return this.applyQuaternion(SK.setFromEuler(J))}applyAxisAngle(J,Q){return this.applyQuaternion(SK.setFromAxisAngle(J,Q))}applyMatrix3(J){let Q=this.x,$=this.y,Z=this.z,W=J.elements;return this.x=W[0]*Q+W[3]*$+W[6]*Z,this.y=W[1]*Q+W[4]*$+W[7]*Z,this.z=W[2]*Q+W[5]*$+W[8]*Z,this}applyNormalMatrix(J){return this.applyMatrix3(J).normalize()}applyMatrix4(J){let Q=this.x,$=this.y,Z=this.z,W=J.elements,K=1/(W[3]*Q+W[7]*$+W[11]*Z+W[15]);return this.x=(W[0]*Q+W[4]*$+W[8]*Z+W[12])*K,this.y=(W[1]*Q+W[5]*$+W[9]*Z+W[13])*K,this.z=(W[2]*Q+W[6]*$+W[10]*Z+W[14])*K,this}applyQuaternion(J){let Q=this.x,$=this.y,Z=this.z,W=J.x,K=J.y,H=J.z,Y=J.w,X=2*(K*Z-H*$),U=2*(H*Q-W*Z),N=2*(W*$-K*Q);return this.x=Q+Y*X+K*N-H*U,this.y=$+Y*U+H*X-W*N,this.z=Z+Y*N+W*U-K*X,this}project(J){return this.applyMatrix4(J.matrixWorldInverse).applyMatrix4(J.projectionMatrix)}unproject(J){return this.applyMatrix4(J.projectionMatrixInverse).applyMatrix4(J.matrixWorld)}transformDirection(J){let Q=this.x,$=this.y,Z=this.z,W=J.elements;return this.x=W[0]*Q+W[4]*$+W[8]*Z,this.y=W[1]*Q+W[5]*$+W[9]*Z,this.z=W[2]*Q+W[6]*$+W[10]*Z,this.normalize()}divide(J){return this.x/=J.x,this.y/=J.y,this.z/=J.z,this}divideScalar(J){return this.multiplyScalar(1/J)}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this.z=Math.min(this.z,J.z),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this.z=Math.max(this.z,J.z),this}clamp(J,Q){return this.x=p0(this.x,J.x,Q.x),this.y=p0(this.y,J.y,Q.y),this.z=p0(this.z,J.z,Q.z),this}clampScalar(J,Q){return this.x=p0(this.x,J,Q),this.y=p0(this.y,J,Q),this.z=p0(this.z,J,Q),this}clampLength(J,Q){let $=this.length();return this.divideScalar($||1).multiplyScalar(p0($,J,Q))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(J){return this.x*J.x+this.y*J.y+this.z*J.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,Q){return this.x+=(J.x-this.x)*Q,this.y+=(J.y-this.y)*Q,this.z+=(J.z-this.z)*Q,this}lerpVectors(J,Q,$){return this.x=J.x+(Q.x-J.x)*$,this.y=J.y+(Q.y-J.y)*$,this.z=J.z+(Q.z-J.z)*$,this}cross(J){return this.crossVectors(this,J)}crossVectors(J,Q){let{x:$,y:Z,z:W}=J,K=Q.x,H=Q.y,Y=Q.z;return this.x=Z*Y-W*H,this.y=W*K-$*Y,this.z=$*H-Z*K,this}projectOnVector(J){let Q=J.lengthSq();if(Q===0)return this.set(0,0,0);let $=J.dot(this)/Q;return this.copy(J).multiplyScalar($)}projectOnPlane(J){return B$.copy(this).projectOnVector(J),this.sub(B$)}reflect(J){return this.sub(B$.copy(J).multiplyScalar(2*this.dot(J)))}angleTo(J){let Q=Math.sqrt(this.lengthSq()*J.lengthSq());if(Q===0)return Math.PI/2;let $=this.dot(J)/Q;return Math.acos(p0($,-1,1))}distanceTo(J){return Math.sqrt(this.distanceToSquared(J))}distanceToSquared(J){let Q=this.x-J.x,$=this.y-J.y,Z=this.z-J.z;return Q*Q+$*$+Z*Z}manhattanDistanceTo(J){return Math.abs(this.x-J.x)+Math.abs(this.y-J.y)+Math.abs(this.z-J.z)}setFromSpherical(J){return this.setFromSphericalCoords(J.radius,J.phi,J.theta)}setFromSphericalCoords(J,Q,$){let Z=Math.sin(Q)*J;return this.x=Z*Math.sin($),this.y=Math.cos(Q)*J,this.z=Z*Math.cos($),this}setFromCylindrical(J){return this.setFromCylindricalCoords(J.radius,J.theta,J.y)}setFromCylindricalCoords(J,Q,$){return this.x=J*Math.sin(Q),this.y=$,this.z=J*Math.cos(Q),this}setFromMatrixPosition(J){let Q=J.elements;return this.x=Q[12],this.y=Q[13],this.z=Q[14],this}setFromMatrixScale(J){let Q=this.setFromMatrixColumn(J,0).length(),$=this.setFromMatrixColumn(J,1).length(),Z=this.setFromMatrixColumn(J,2).length();return this.x=Q,this.y=$,this.z=Z,this}setFromMatrixColumn(J,Q){return this.fromArray(J.elements,Q*4)}setFromMatrix3Column(J,Q){return this.fromArray(J.elements,Q*3)}setFromEuler(J){return this.x=J._x,this.y=J._y,this.z=J._z,this}setFromColor(J){return this.x=J.r,this.y=J.g,this.z=J.b,this}equals(J){return J.x===this.x&&J.y===this.y&&J.z===this.z}fromArray(J,Q=0){return this.x=J[Q],this.y=J[Q+1],this.z=J[Q+2],this}toArray(J=[],Q=0){return J[Q]=this.x,J[Q+1]=this.y,J[Q+2]=this.z,J}fromBufferAttribute(J,Q){return this.x=J.getX(Q),this.y=J.getY(Q),this.z=J.getZ(Q),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let J=Math.random()*Math.PI*2,Q=Math.random()*2-1,$=Math.sqrt(1-Q*Q);return this.x=$*Math.cos(J),this.y=Q,this.z=$*Math.sin(J),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}var B$=new _,SK=new zJ;class n0{constructor(J,Q,$,Z,W,K,H,Y,X){if(n0.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],J!==void 0)this.set(J,Q,$,Z,W,K,H,Y,X)}set(J,Q,$,Z,W,K,H,Y,X){let U=this.elements;return U[0]=J,U[1]=Z,U[2]=H,U[3]=Q,U[4]=W,U[5]=Y,U[6]=$,U[7]=K,U[8]=X,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(J){let Q=this.elements,$=J.elements;return Q[0]=$[0],Q[1]=$[1],Q[2]=$[2],Q[3]=$[3],Q[4]=$[4],Q[5]=$[5],Q[6]=$[6],Q[7]=$[7],Q[8]=$[8],this}extractBasis(J,Q,$){return J.setFromMatrix3Column(this,0),Q.setFromMatrix3Column(this,1),$.setFromMatrix3Column(this,2),this}setFromMatrix4(J){let Q=J.elements;return this.set(Q[0],Q[4],Q[8],Q[1],Q[5],Q[9],Q[2],Q[6],Q[10]),this}multiply(J){return this.multiplyMatrices(this,J)}premultiply(J){return this.multiplyMatrices(J,this)}multiplyMatrices(J,Q){let $=J.elements,Z=Q.elements,W=this.elements,K=$[0],H=$[3],Y=$[6],X=$[1],U=$[4],N=$[7],q=$[2],G=$[5],E=$[8],O=Z[0],R=Z[3],D=Z[6],F=Z[1],M=Z[4],L=Z[7],B=Z[2],P=Z[5],C=Z[8];return W[0]=K*O+H*F+Y*B,W[3]=K*R+H*M+Y*P,W[6]=K*D+H*L+Y*C,W[1]=X*O+U*F+N*B,W[4]=X*R+U*M+N*P,W[7]=X*D+U*L+N*C,W[2]=q*O+G*F+E*B,W[5]=q*R+G*M+E*P,W[8]=q*D+G*L+E*C,this}multiplyScalar(J){let Q=this.elements;return Q[0]*=J,Q[3]*=J,Q[6]*=J,Q[1]*=J,Q[4]*=J,Q[7]*=J,Q[2]*=J,Q[5]*=J,Q[8]*=J,this}determinant(){let J=this.elements,Q=J[0],$=J[1],Z=J[2],W=J[3],K=J[4],H=J[5],Y=J[6],X=J[7],U=J[8];return Q*K*U-Q*H*X-$*W*U+$*H*Y+Z*W*X-Z*K*Y}invert(){let J=this.elements,Q=J[0],$=J[1],Z=J[2],W=J[3],K=J[4],H=J[5],Y=J[6],X=J[7],U=J[8],N=U*K-H*X,q=H*Y-U*W,G=X*W-K*Y,E=Q*N+$*q+Z*G;if(E===0)return this.set(0,0,0,0,0,0,0,0,0);let O=1/E;return J[0]=N*O,J[1]=(Z*X-U*$)*O,J[2]=(H*$-Z*K)*O,J[3]=q*O,J[4]=(U*Q-Z*Y)*O,J[5]=(Z*W-H*Q)*O,J[6]=G*O,J[7]=($*Y-X*Q)*O,J[8]=(K*Q-$*W)*O,this}transpose(){let J,Q=this.elements;return J=Q[1],Q[1]=Q[3],Q[3]=J,J=Q[2],Q[2]=Q[6],Q[6]=J,J=Q[5],Q[5]=Q[7],Q[7]=J,this}getNormalMatrix(J){return this.setFromMatrix4(J).invert().transpose()}transposeIntoArray(J){let Q=this.elements;return J[0]=Q[0],J[1]=Q[3],J[2]=Q[6],J[3]=Q[1],J[4]=Q[4],J[5]=Q[7],J[6]=Q[2],J[7]=Q[5],J[8]=Q[8],this}setUvTransform(J,Q,$,Z,W,K,H){let Y=Math.cos(W),X=Math.sin(W);return this.set($*Y,$*X,-$*(Y*K+X*H)+K+J,-Z*X,Z*Y,-Z*(-X*K+Y*H)+H+Q,0,0,1),this}scale(J,Q){return this.premultiply(z$.makeScale(J,Q)),this}rotate(J){return this.premultiply(z$.makeRotation(-J)),this}translate(J,Q){return this.premultiply(z$.makeTranslation(J,Q)),this}makeTranslation(J,Q){if(J.isVector2)this.set(1,0,J.x,0,1,J.y,0,0,1);else this.set(1,0,J,0,1,Q,0,0,1);return this}makeRotation(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(Q,-$,0,$,Q,0,0,0,1),this}makeScale(J,Q){return this.set(J,0,0,0,Q,0,0,0,1),this}equals(J){let Q=this.elements,$=J.elements;for(let Z=0;Z<9;Z++)if(Q[Z]!==$[Z])return!1;return!0}fromArray(J,Q=0){for(let $=0;$<9;$++)this.elements[$]=J[$+Q];return this}toArray(J=[],Q=0){let $=this.elements;return J[Q]=$[0],J[Q+1]=$[1],J[Q+2]=$[2],J[Q+3]=$[3],J[Q+4]=$[4],J[Q+5]=$[5],J[Q+6]=$[6],J[Q+7]=$[7],J[Q+8]=$[8],J}clone(){return new this.constructor().fromArray(this.elements)}}var z$=new n0,jK=new n0().set(0.4123908,0.3575843,0.1804808,0.212639,0.7151687,0.0721923,0.0193308,0.1191948,0.9505322),yK=new n0().set(3.2409699,-1.5373832,-0.4986108,-0.9692436,1.8759675,0.0415551,0.0556301,-0.203977,1.0569715);function z5(){let J={enabled:!0,workingColorSpace:"srgb-linear",spaces:{},convert:function(W,K,H){if(this.enabled===!1||K===H||!K||!H)return W;if(this.spaces[K].transfer==="srgb")W.r=h9(W.r),W.g=h9(W.g),W.b=h9(W.b);if(this.spaces[K].primaries!==this.spaces[H].primaries)W.applyMatrix3(this.spaces[K].toXYZ),W.applyMatrix3(this.spaces[H].fromXYZ);if(this.spaces[H].transfer==="srgb")W.r=q7(W.r),W.g=q7(W.g),W.b=q7(W.b);return W},workingToColorSpace:function(W,K){return this.convert(W,this.workingColorSpace,K)},colorSpaceToWorking:function(W,K){return this.convert(W,K,this.workingColorSpace)},getPrimaries:function(W){return this.spaces[W].primaries},getTransfer:function(W){if(W==="")return"linear";return this.spaces[W].transfer},getToneMappingMode:function(W){return this.spaces[W].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(W,K=this.workingColorSpace){return W.fromArray(this.spaces[K].luminanceCoefficients)},define:function(W){Object.assign(this.spaces,W)},_getMatrix:function(W,K,H){return W.copy(this.spaces[K].toXYZ).multiply(this.spaces[H].fromXYZ)},_getDrawingBufferColorSpace:function(W){return this.spaces[W].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(W=this.workingColorSpace){return this.spaces[W].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(W,K){return i7("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),J.workingToColorSpace(W,K)},toWorkingColorSpace:function(W,K){return i7("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),J.colorSpaceToWorking(W,K)}},Q=[0.64,0.33,0.3,0.6,0.15,0.06],$=[0.2126,0.7152,0.0722],Z=[0.3127,0.329];return J.define({["srgb-linear"]:{primaries:Q,whitePoint:Z,transfer:"linear",toXYZ:jK,fromXYZ:yK,luminanceCoefficients:$,workingColorSpaceConfig:{unpackColorSpace:"srgb"},outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}},["srgb"]:{primaries:Q,whitePoint:Z,transfer:"srgb",toXYZ:jK,fromXYZ:yK,luminanceCoefficients:$,outputColorSpaceConfig:{drawingBufferColorSpace:"srgb"}}}),J}var JJ=z5();function h9(J){return J<0.04045?J*0.0773993808:Math.pow(J*0.9478672986+0.0521327014,2.4)}function q7(J){return J<0.0031308?J*12.92:1.055*Math.pow(J,0.41666)-0.055}var c8;class NW{static getDataURL(J,Q="image/png"){if(/^data:/i.test(J.src))return J.src;if(typeof HTMLCanvasElement>"u")return J.src;let $;if(J instanceof HTMLCanvasElement)$=J;else{if(c8===void 0)c8=E7("canvas");c8.width=J.width,c8.height=J.height;let Z=c8.getContext("2d");if(J instanceof ImageData)Z.putImageData(J,0,0);else Z.drawImage(J,0,0,J.width,J.height);$=c8}return $.toDataURL(Q)}static sRGBToLinear(J){if(typeof HTMLImageElement<"u"&&J instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&J instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&J instanceof ImageBitmap){let Q=E7("canvas");Q.width=J.width,Q.height=J.height;let $=Q.getContext("2d");$.drawImage(J,0,0,J.width,J.height);let Z=$.getImageData(0,0,J.width,J.height),W=Z.data;for(let K=0;K<W.length;K++)W[K]=h9(W[K]/255)*255;return $.putImageData(Z,0,0),Q}else if(J.data){let Q=J.data.slice(0);for(let $=0;$<Q.length;$++)if(Q instanceof Uint8Array||Q instanceof Uint8ClampedArray)Q[$]=Math.floor(h9(Q[$]/255)*255);else Q[$]=h9(Q[$]);return{data:Q,width:J.width,height:J.height}}else return q0("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),J}}var I5=0;class v9{constructor(J=null){this.isSource=!0,Object.defineProperty(this,"id",{value:I5++}),this.uuid=eJ(),this.data=J,this.dataReady=!0,this.version=0}getSize(J){let Q=this.data;if(typeof HTMLVideoElement<"u"&&Q instanceof HTMLVideoElement)J.set(Q.videoWidth,Q.videoHeight,0);else if(typeof VideoFrame<"u"&&Q instanceof VideoFrame)J.set(Q.displayHeight,Q.displayWidth,0);else if(Q!==null)J.set(Q.width,Q.height,Q.depth||0);else J.set(0,0,0);return J}set needsUpdate(J){if(J===!0)this.version++}toJSON(J){let Q=J===void 0||typeof J==="string";if(!Q&&J.images[this.uuid]!==void 0)return J.images[this.uuid];let $={uuid:this.uuid,url:""},Z=this.data;if(Z!==null){let W;if(Array.isArray(Z)){W=[];for(let K=0,H=Z.length;K<H;K++)if(Z[K].isDataTexture)W.push(I$(Z[K].image));else W.push(I$(Z[K]))}else W=I$(Z);$.url=W}if(!Q)J.images[this.uuid]=$;return $}}function I$(J){if(typeof HTMLImageElement<"u"&&J instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&J instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&J instanceof ImageBitmap)return NW.getDataURL(J);else if(J.data)return{data:Array.from(J.data),width:J.width,height:J.height,type:J.data.constructor.name};else return q0("Texture: Unable to serialize Texture."),{}}var C5=0,C$=new _;class kJ extends F9{constructor(J=kJ.DEFAULT_IMAGE,Q=kJ.DEFAULT_MAPPING,$=1001,Z=1001,W=1006,K=1008,H=1023,Y=1009,X=kJ.DEFAULT_ANISOTROPY,U=""){super();this.isTexture=!0,Object.defineProperty(this,"id",{value:C5++}),this.uuid=eJ(),this.name="",this.source=new v9(J),this.mipmaps=[],this.mapping=Q,this.channel=0,this.wrapS=$,this.wrapT=Z,this.magFilter=W,this.minFilter=K,this.anisotropy=X,this.format=H,this.internalFormat=null,this.type=Y,this.offset=new s(0,0),this.repeat=new s(1,1),this.center=new s(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new n0,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=U,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=J&&J.depth&&J.depth>1?!0:!1,this.pmremVersion=0}get width(){return this.source.getSize(C$).x}get height(){return this.source.getSize(C$).y}get depth(){return this.source.getSize(C$).z}get image(){return this.source.data}set image(J=null){this.source.data=J}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(J,Q){this.updateRanges.push({start:J,count:Q})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(J){return this.name=J.name,this.source=J.source,this.mipmaps=J.mipmaps.slice(0),this.mapping=J.mapping,this.channel=J.channel,this.wrapS=J.wrapS,this.wrapT=J.wrapT,this.magFilter=J.magFilter,this.minFilter=J.minFilter,this.anisotropy=J.anisotropy,this.format=J.format,this.internalFormat=J.internalFormat,this.type=J.type,this.offset.copy(J.offset),this.repeat.copy(J.repeat),this.center.copy(J.center),this.rotation=J.rotation,this.matrixAutoUpdate=J.matrixAutoUpdate,this.matrix.copy(J.matrix),this.generateMipmaps=J.generateMipmaps,this.premultiplyAlpha=J.premultiplyAlpha,this.flipY=J.flipY,this.unpackAlignment=J.unpackAlignment,this.colorSpace=J.colorSpace,this.renderTarget=J.renderTarget,this.isRenderTargetTexture=J.isRenderTargetTexture,this.isArrayTexture=J.isArrayTexture,this.userData=JSON.parse(JSON.stringify(J.userData)),this.needsUpdate=!0,this}setValues(J){for(let Q in J){let $=J[Q];if($===void 0){q0(`Texture.setValues(): parameter '${Q}' has value of undefined.`);continue}let Z=this[Q];if(Z===void 0){q0(`Texture.setValues(): property '${Q}' does not exist.`);continue}if(Z&&$&&(Z.isVector2&&$.isVector2))Z.copy($);else if(Z&&$&&(Z.isVector3&&$.isVector3))Z.copy($);else if(Z&&$&&(Z.isMatrix3&&$.isMatrix3))Z.copy($);else this[Q]=$}}toJSON(J){let Q=J===void 0||typeof J==="string";if(!Q&&J.textures[this.uuid]!==void 0)return J.textures[this.uuid];let $={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(J).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};if(Object.keys(this.userData).length>0)$.userData=this.userData;if(!Q)J.textures[this.uuid]=$;return $}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(J){if(this.mapping!==300)return J;if(J.applyMatrix3(this.matrix),J.x<0||J.x>1)switch(this.wrapS){case 1000:J.x=J.x-Math.floor(J.x);break;case 1001:J.x=J.x<0?0:1;break;case 1002:if(Math.abs(Math.floor(J.x)%2)===1)J.x=Math.ceil(J.x)-J.x;else J.x=J.x-Math.floor(J.x);break}if(J.y<0||J.y>1)switch(this.wrapT){case 1000:J.y=J.y-Math.floor(J.y);break;case 1001:J.y=J.y<0?0:1;break;case 1002:if(Math.abs(Math.floor(J.y)%2)===1)J.y=Math.ceil(J.y)-J.y;else J.y=J.y-Math.floor(J.y);break}if(this.flipY)J.y=1-J.y;return J}set needsUpdate(J){if(J===!0)this.version++,this.source.needsUpdate=!0}set needsPMREMUpdate(J){if(J===!0)this.pmremVersion++}}kJ.DEFAULT_IMAGE=null;kJ.DEFAULT_MAPPING=300;kJ.DEFAULT_ANISOTROPY=1;class qJ{constructor(J=0,Q=0,$=0,Z=1){qJ.prototype.isVector4=!0,this.x=J,this.y=Q,this.z=$,this.w=Z}get width(){return this.z}set width(J){this.z=J}get height(){return this.w}set height(J){this.w=J}set(J,Q,$,Z){return this.x=J,this.y=Q,this.z=$,this.w=Z,this}setScalar(J){return this.x=J,this.y=J,this.z=J,this.w=J,this}setX(J){return this.x=J,this}setY(J){return this.y=J,this}setZ(J){return this.z=J,this}setW(J){return this.w=J,this}setComponent(J,Q){switch(J){case 0:this.x=Q;break;case 1:this.y=Q;break;case 2:this.z=Q;break;case 3:this.w=Q;break;default:throw Error("index is out of range: "+J)}return this}getComponent(J){switch(J){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error("index is out of range: "+J)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(J){return this.x=J.x,this.y=J.y,this.z=J.z,this.w=J.w!==void 0?J.w:1,this}add(J){return this.x+=J.x,this.y+=J.y,this.z+=J.z,this.w+=J.w,this}addScalar(J){return this.x+=J,this.y+=J,this.z+=J,this.w+=J,this}addVectors(J,Q){return this.x=J.x+Q.x,this.y=J.y+Q.y,this.z=J.z+Q.z,this.w=J.w+Q.w,this}addScaledVector(J,Q){return this.x+=J.x*Q,this.y+=J.y*Q,this.z+=J.z*Q,this.w+=J.w*Q,this}sub(J){return this.x-=J.x,this.y-=J.y,this.z-=J.z,this.w-=J.w,this}subScalar(J){return this.x-=J,this.y-=J,this.z-=J,this.w-=J,this}subVectors(J,Q){return this.x=J.x-Q.x,this.y=J.y-Q.y,this.z=J.z-Q.z,this.w=J.w-Q.w,this}multiply(J){return this.x*=J.x,this.y*=J.y,this.z*=J.z,this.w*=J.w,this}multiplyScalar(J){return this.x*=J,this.y*=J,this.z*=J,this.w*=J,this}applyMatrix4(J){let Q=this.x,$=this.y,Z=this.z,W=this.w,K=J.elements;return this.x=K[0]*Q+K[4]*$+K[8]*Z+K[12]*W,this.y=K[1]*Q+K[5]*$+K[9]*Z+K[13]*W,this.z=K[2]*Q+K[6]*$+K[10]*Z+K[14]*W,this.w=K[3]*Q+K[7]*$+K[11]*Z+K[15]*W,this}divide(J){return this.x/=J.x,this.y/=J.y,this.z/=J.z,this.w/=J.w,this}divideScalar(J){return this.multiplyScalar(1/J)}setAxisAngleFromQuaternion(J){this.w=2*Math.acos(J.w);let Q=Math.sqrt(1-J.w*J.w);if(Q<0.0001)this.x=1,this.y=0,this.z=0;else this.x=J.x/Q,this.y=J.y/Q,this.z=J.z/Q;return this}setAxisAngleFromRotationMatrix(J){let Q,$,Z,W,K=0.01,H=0.1,Y=J.elements,X=Y[0],U=Y[4],N=Y[8],q=Y[1],G=Y[5],E=Y[9],O=Y[2],R=Y[6],D=Y[10];if(Math.abs(U-q)<0.01&&Math.abs(N-O)<0.01&&Math.abs(E-R)<0.01){if(Math.abs(U+q)<0.1&&Math.abs(N+O)<0.1&&Math.abs(E+R)<0.1&&Math.abs(X+G+D-3)<0.1)return this.set(1,0,0,0),this;Q=Math.PI;let M=(X+1)/2,L=(G+1)/2,B=(D+1)/2,P=(U+q)/4,C=(N+O)/4,w=(E+R)/4;if(M>L&&M>B)if(M<0.01)$=0,Z=0.707106781,W=0.707106781;else $=Math.sqrt(M),Z=P/$,W=C/$;else if(L>B)if(L<0.01)$=0.707106781,Z=0,W=0.707106781;else Z=Math.sqrt(L),$=P/Z,W=w/Z;else if(B<0.01)$=0.707106781,Z=0.707106781,W=0;else W=Math.sqrt(B),$=C/W,Z=w/W;return this.set($,Z,W,Q),this}let F=Math.sqrt((R-E)*(R-E)+(N-O)*(N-O)+(q-U)*(q-U));if(Math.abs(F)<0.001)F=1;return this.x=(R-E)/F,this.y=(N-O)/F,this.z=(q-U)/F,this.w=Math.acos((X+G+D-1)/2),this}setFromMatrixPosition(J){let Q=J.elements;return this.x=Q[12],this.y=Q[13],this.z=Q[14],this.w=Q[15],this}min(J){return this.x=Math.min(this.x,J.x),this.y=Math.min(this.y,J.y),this.z=Math.min(this.z,J.z),this.w=Math.min(this.w,J.w),this}max(J){return this.x=Math.max(this.x,J.x),this.y=Math.max(this.y,J.y),this.z=Math.max(this.z,J.z),this.w=Math.max(this.w,J.w),this}clamp(J,Q){return this.x=p0(this.x,J.x,Q.x),this.y=p0(this.y,J.y,Q.y),this.z=p0(this.z,J.z,Q.z),this.w=p0(this.w,J.w,Q.w),this}clampScalar(J,Q){return this.x=p0(this.x,J,Q),this.y=p0(this.y,J,Q),this.z=p0(this.z,J,Q),this.w=p0(this.w,J,Q),this}clampLength(J,Q){let $=this.length();return this.divideScalar($||1).multiplyScalar(p0($,J,Q))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(J){return this.x*J.x+this.y*J.y+this.z*J.z+this.w*J.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(J){return this.normalize().multiplyScalar(J)}lerp(J,Q){return this.x+=(J.x-this.x)*Q,this.y+=(J.y-this.y)*Q,this.z+=(J.z-this.z)*Q,this.w+=(J.w-this.w)*Q,this}lerpVectors(J,Q,$){return this.x=J.x+(Q.x-J.x)*$,this.y=J.y+(Q.y-J.y)*$,this.z=J.z+(Q.z-J.z)*$,this.w=J.w+(Q.w-J.w)*$,this}equals(J){return J.x===this.x&&J.y===this.y&&J.z===this.z&&J.w===this.w}fromArray(J,Q=0){return this.x=J[Q],this.y=J[Q+1],this.z=J[Q+2],this.w=J[Q+3],this}toArray(J=[],Q=0){return J[Q]=this.x,J[Q+1]=this.y,J[Q+2]=this.z,J[Q+3]=this.w,J}fromBufferAttribute(J,Q){return this.x=J.getX(Q),this.y=J.getY(Q),this.z=J.getZ(Q),this.w=J.getW(Q),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class _Q extends F9{constructor(J=1,Q=1,$={}){super();$=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:1006,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},$),this.isRenderTarget=!0,this.width=J,this.height=Q,this.depth=$.depth,this.scissor=new qJ(0,0,J,Q),this.scissorTest=!1,this.viewport=new qJ(0,0,J,Q),this.textures=[];let Z={width:J,height:Q,depth:$.depth},W=new kJ(Z),K=$.count;for(let H=0;H<K;H++)this.textures[H]=W.clone(),this.textures[H].isRenderTargetTexture=!0,this.textures[H].renderTarget=this;this._setTextureOptions($),this.depthBuffer=$.depthBuffer,this.stencilBuffer=$.stencilBuffer,this.resolveDepthBuffer=$.resolveDepthBuffer,this.resolveStencilBuffer=$.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=$.depthTexture,this.samples=$.samples,this.multiview=$.multiview}_setTextureOptions(J={}){let Q={minFilter:1006,generateMipmaps:!1,flipY:!1,internalFormat:null};if(J.mapping!==void 0)Q.mapping=J.mapping;if(J.wrapS!==void 0)Q.wrapS=J.wrapS;if(J.wrapT!==void 0)Q.wrapT=J.wrapT;if(J.wrapR!==void 0)Q.wrapR=J.wrapR;if(J.magFilter!==void 0)Q.magFilter=J.magFilter;if(J.minFilter!==void 0)Q.minFilter=J.minFilter;if(J.format!==void 0)Q.format=J.format;if(J.type!==void 0)Q.type=J.type;if(J.anisotropy!==void 0)Q.anisotropy=J.anisotropy;if(J.colorSpace!==void 0)Q.colorSpace=J.colorSpace;if(J.flipY!==void 0)Q.flipY=J.flipY;if(J.generateMipmaps!==void 0)Q.generateMipmaps=J.generateMipmaps;if(J.internalFormat!==void 0)Q.internalFormat=J.internalFormat;for(let $=0;$<this.textures.length;$++)this.textures[$].setValues(Q)}get texture(){return this.textures[0]}set texture(J){this.textures[0]=J}set depthTexture(J){if(this._depthTexture!==null)this._depthTexture.renderTarget=null;if(J!==null)J.renderTarget=this;this._depthTexture=J}get depthTexture(){return this._depthTexture}setSize(J,Q,$=1){if(this.width!==J||this.height!==Q||this.depth!==$){this.width=J,this.height=Q,this.depth=$;for(let Z=0,W=this.textures.length;Z<W;Z++)if(this.textures[Z].image.width=J,this.textures[Z].image.height=Q,this.textures[Z].image.depth=$,this.textures[Z].isData3DTexture!==!0)this.textures[Z].isArrayTexture=this.textures[Z].image.depth>1;this.dispose()}this.viewport.set(0,0,J,Q),this.scissor.set(0,0,J,Q)}clone(){return new this.constructor().copy(this)}copy(J){this.width=J.width,this.height=J.height,this.depth=J.depth,this.scissor.copy(J.scissor),this.scissorTest=J.scissorTest,this.viewport.copy(J.viewport),this.textures.length=0;for(let Q=0,$=J.textures.length;Q<$;Q++){this.textures[Q]=J.textures[Q].clone(),this.textures[Q].isRenderTargetTexture=!0,this.textures[Q].renderTarget=this;let Z=Object.assign({},J.textures[Q].image);this.textures[Q].source=new v9(Z)}if(this.depthBuffer=J.depthBuffer,this.stencilBuffer=J.stencilBuffer,this.resolveDepthBuffer=J.resolveDepthBuffer,this.resolveStencilBuffer=J.resolveStencilBuffer,J.depthTexture!==null)this.depthTexture=J.depthTexture.clone();return this.samples=J.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class iJ extends _Q{constructor(J=1,Q=1,$={}){super(J,Q,$);this.isWebGLRenderTarget=!0}}class K6 extends kJ{constructor(J=null,Q=1,$=1,Z=1){super(null);this.isDataArrayTexture=!0,this.image={data:J,width:Q,height:$,depth:Z},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(J){this.layerUpdates.add(J)}clearLayerUpdates(){this.layerUpdates.clear()}}class pY extends iJ{constructor(J=1,Q=1,$=1,Z={}){super(J,Q,Z);this.isWebGLArrayRenderTarget=!0,this.depth=$,this.texture=new K6(null,J,Q,$),this._setTextureOptions(Z),this.texture.isRenderTargetTexture=!0}}class H6 extends kJ{constructor(J=null,Q=1,$=1,Z=1){super(null);this.isData3DTexture=!0,this.image={data:J,width:Q,height:$,depth:Z},this.magFilter=1003,this.minFilter=1003,this.wrapR=1001,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class mY extends iJ{constructor(J=1,Q=1,$=1,Z={}){super(J,Q,Z);this.isWebGL3DRenderTarget=!0,this.depth=$,this.texture=new H6(null,J,Q,$),this._setTextureOptions(Z),this.texture.isRenderTargetTexture=!0}}class m0{constructor(J,Q,$,Z,W,K,H,Y,X,U,N,q,G,E,O,R){if(m0.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],J!==void 0)this.set(J,Q,$,Z,W,K,H,Y,X,U,N,q,G,E,O,R)}set(J,Q,$,Z,W,K,H,Y,X,U,N,q,G,E,O,R){let D=this.elements;return D[0]=J,D[4]=Q,D[8]=$,D[12]=Z,D[1]=W,D[5]=K,D[9]=H,D[13]=Y,D[2]=X,D[6]=U,D[10]=N,D[14]=q,D[3]=G,D[7]=E,D[11]=O,D[15]=R,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new m0().fromArray(this.elements)}copy(J){let Q=this.elements,$=J.elements;return Q[0]=$[0],Q[1]=$[1],Q[2]=$[2],Q[3]=$[3],Q[4]=$[4],Q[5]=$[5],Q[6]=$[6],Q[7]=$[7],Q[8]=$[8],Q[9]=$[9],Q[10]=$[10],Q[11]=$[11],Q[12]=$[12],Q[13]=$[13],Q[14]=$[14],Q[15]=$[15],this}copyPosition(J){let Q=this.elements,$=J.elements;return Q[12]=$[12],Q[13]=$[13],Q[14]=$[14],this}setFromMatrix3(J){let Q=J.elements;return this.set(Q[0],Q[3],Q[6],0,Q[1],Q[4],Q[7],0,Q[2],Q[5],Q[8],0,0,0,0,1),this}extractBasis(J,Q,$){if(this.determinant()===0)return J.set(1,0,0),Q.set(0,1,0),$.set(0,0,1),this;return J.setFromMatrixColumn(this,0),Q.setFromMatrixColumn(this,1),$.setFromMatrixColumn(this,2),this}makeBasis(J,Q,$){return this.set(J.x,Q.x,$.x,0,J.y,Q.y,$.y,0,J.z,Q.z,$.z,0,0,0,0,1),this}extractRotation(J){if(J.determinant()===0)return this.identity();let Q=this.elements,$=J.elements,Z=1/n8.setFromMatrixColumn(J,0).length(),W=1/n8.setFromMatrixColumn(J,1).length(),K=1/n8.setFromMatrixColumn(J,2).length();return Q[0]=$[0]*Z,Q[1]=$[1]*Z,Q[2]=$[2]*Z,Q[3]=0,Q[4]=$[4]*W,Q[5]=$[5]*W,Q[6]=$[6]*W,Q[7]=0,Q[8]=$[8]*K,Q[9]=$[9]*K,Q[10]=$[10]*K,Q[11]=0,Q[12]=0,Q[13]=0,Q[14]=0,Q[15]=1,this}makeRotationFromEuler(J){let Q=this.elements,$=J.x,Z=J.y,W=J.z,K=Math.cos($),H=Math.sin($),Y=Math.cos(Z),X=Math.sin(Z),U=Math.cos(W),N=Math.sin(W);if(J.order==="XYZ"){let q=K*U,G=K*N,E=H*U,O=H*N;Q[0]=Y*U,Q[4]=-Y*N,Q[8]=X,Q[1]=G+E*X,Q[5]=q-O*X,Q[9]=-H*Y,Q[2]=O-q*X,Q[6]=E+G*X,Q[10]=K*Y}else if(J.order==="YXZ"){let q=Y*U,G=Y*N,E=X*U,O=X*N;Q[0]=q+O*H,Q[4]=E*H-G,Q[8]=K*X,Q[1]=K*N,Q[5]=K*U,Q[9]=-H,Q[2]=G*H-E,Q[6]=O+q*H,Q[10]=K*Y}else if(J.order==="ZXY"){let q=Y*U,G=Y*N,E=X*U,O=X*N;Q[0]=q-O*H,Q[4]=-K*N,Q[8]=E+G*H,Q[1]=G+E*H,Q[5]=K*U,Q[9]=O-q*H,Q[2]=-K*X,Q[6]=H,Q[10]=K*Y}else if(J.order==="ZYX"){let q=K*U,G=K*N,E=H*U,O=H*N;Q[0]=Y*U,Q[4]=E*X-G,Q[8]=q*X+O,Q[1]=Y*N,Q[5]=O*X+q,Q[9]=G*X-E,Q[2]=-X,Q[6]=H*Y,Q[10]=K*Y}else if(J.order==="YZX"){let q=K*Y,G=K*X,E=H*Y,O=H*X;Q[0]=Y*U,Q[4]=O-q*N,Q[8]=E*N+G,Q[1]=N,Q[5]=K*U,Q[9]=-H*U,Q[2]=-X*U,Q[6]=G*N+E,Q[10]=q-O*N}else if(J.order==="XZY"){let q=K*Y,G=K*X,E=H*Y,O=H*X;Q[0]=Y*U,Q[4]=-N,Q[8]=X*U,Q[1]=q*N+O,Q[5]=K*U,Q[9]=G*N-E,Q[2]=E*N-G,Q[6]=H*U,Q[10]=O*N+q}return Q[3]=0,Q[7]=0,Q[11]=0,Q[12]=0,Q[13]=0,Q[14]=0,Q[15]=1,this}makeRotationFromQuaternion(J){return this.compose(w5,J,A5)}lookAt(J,Q,$){let Z=this.elements;if(rJ.subVectors(J,Q),rJ.lengthSq()===0)rJ.z=1;if(rJ.normalize(),n9.crossVectors($,rJ),n9.lengthSq()===0){if(Math.abs($.z)===1)rJ.x+=0.0001;else rJ.z+=0.0001;rJ.normalize(),n9.crossVectors($,rJ)}return n9.normalize(),I6.crossVectors(rJ,n9),Z[0]=n9.x,Z[4]=I6.x,Z[8]=rJ.x,Z[1]=n9.y,Z[5]=I6.y,Z[9]=rJ.y,Z[2]=n9.z,Z[6]=I6.z,Z[10]=rJ.z,this}multiply(J){return this.multiplyMatrices(this,J)}premultiply(J){return this.multiplyMatrices(J,this)}multiplyMatrices(J,Q){let $=J.elements,Z=Q.elements,W=this.elements,K=$[0],H=$[4],Y=$[8],X=$[12],U=$[1],N=$[5],q=$[9],G=$[13],E=$[2],O=$[6],R=$[10],D=$[14],F=$[3],M=$[7],L=$[11],B=$[15],P=Z[0],C=Z[4],w=Z[8],k=Z[12],A=Z[1],h=Z[5],S=Z[9],v=Z[13],l=Z[2],f=Z[6],c=Z[10],x=Z[14],m=Z[3],Q0=Z[7],$0=Z[11],U0=Z[15];return W[0]=K*P+H*A+Y*l+X*m,W[4]=K*C+H*h+Y*f+X*Q0,W[8]=K*w+H*S+Y*c+X*$0,W[12]=K*k+H*v+Y*x+X*U0,W[1]=U*P+N*A+q*l+G*m,W[5]=U*C+N*h+q*f+G*Q0,W[9]=U*w+N*S+q*c+G*$0,W[13]=U*k+N*v+q*x+G*U0,W[2]=E*P+O*A+R*l+D*m,W[6]=E*C+O*h+R*f+D*Q0,W[10]=E*w+O*S+R*c+D*$0,W[14]=E*k+O*v+R*x+D*U0,W[3]=F*P+M*A+L*l+B*m,W[7]=F*C+M*h+L*f+B*Q0,W[11]=F*w+M*S+L*c+B*$0,W[15]=F*k+M*v+L*x+B*U0,this}multiplyScalar(J){let Q=this.elements;return Q[0]*=J,Q[4]*=J,Q[8]*=J,Q[12]*=J,Q[1]*=J,Q[5]*=J,Q[9]*=J,Q[13]*=J,Q[2]*=J,Q[6]*=J,Q[10]*=J,Q[14]*=J,Q[3]*=J,Q[7]*=J,Q[11]*=J,Q[15]*=J,this}determinant(){let J=this.elements,Q=J[0],$=J[4],Z=J[8],W=J[12],K=J[1],H=J[5],Y=J[9],X=J[13],U=J[2],N=J[6],q=J[10],G=J[14],E=J[3],O=J[7],R=J[11],D=J[15],F=Y*G-X*q,M=H*G-X*N,L=H*q-Y*N,B=K*G-X*U,P=K*q-Y*U,C=K*N-H*U;return Q*(O*F-R*M+D*L)-$*(E*F-R*B+D*P)+Z*(E*M-O*B+D*C)-W*(E*L-O*P+R*C)}transpose(){let J=this.elements,Q;return Q=J[1],J[1]=J[4],J[4]=Q,Q=J[2],J[2]=J[8],J[8]=Q,Q=J[6],J[6]=J[9],J[9]=Q,Q=J[3],J[3]=J[12],J[12]=Q,Q=J[7],J[7]=J[13],J[13]=Q,Q=J[11],J[11]=J[14],J[14]=Q,this}setPosition(J,Q,$){let Z=this.elements;if(J.isVector3)Z[12]=J.x,Z[13]=J.y,Z[14]=J.z;else Z[12]=J,Z[13]=Q,Z[14]=$;return this}invert(){let J=this.elements,Q=J[0],$=J[1],Z=J[2],W=J[3],K=J[4],H=J[5],Y=J[6],X=J[7],U=J[8],N=J[9],q=J[10],G=J[11],E=J[12],O=J[13],R=J[14],D=J[15],F=Q*H-$*K,M=Q*Y-Z*K,L=Q*X-W*K,B=$*Y-Z*H,P=$*X-W*H,C=Z*X-W*Y,w=U*O-N*E,k=U*R-q*E,A=U*D-G*E,h=N*R-q*O,S=N*D-G*O,v=q*D-G*R,l=F*v-M*S+L*h+B*A-P*k+C*w;if(l===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let f=1/l;return J[0]=(H*v-Y*S+X*h)*f,J[1]=(Z*S-$*v-W*h)*f,J[2]=(O*C-R*P+D*B)*f,J[3]=(q*P-N*C-G*B)*f,J[4]=(Y*A-K*v-X*k)*f,J[5]=(Q*v-Z*A+W*k)*f,J[6]=(R*L-E*C-D*M)*f,J[7]=(U*C-q*L+G*M)*f,J[8]=(K*S-H*A+X*w)*f,J[9]=($*A-Q*S-W*w)*f,J[10]=(E*P-O*L+D*F)*f,J[11]=(N*L-U*P-G*F)*f,J[12]=(H*k-K*h-Y*w)*f,J[13]=(Q*h-$*k+Z*w)*f,J[14]=(O*M-E*B-R*F)*f,J[15]=(U*B-N*M+q*F)*f,this}scale(J){let Q=this.elements,$=J.x,Z=J.y,W=J.z;return Q[0]*=$,Q[4]*=Z,Q[8]*=W,Q[1]*=$,Q[5]*=Z,Q[9]*=W,Q[2]*=$,Q[6]*=Z,Q[10]*=W,Q[3]*=$,Q[7]*=Z,Q[11]*=W,this}getMaxScaleOnAxis(){let J=this.elements,Q=J[0]*J[0]+J[1]*J[1]+J[2]*J[2],$=J[4]*J[4]+J[5]*J[5]+J[6]*J[6],Z=J[8]*J[8]+J[9]*J[9]+J[10]*J[10];return Math.sqrt(Math.max(Q,$,Z))}makeTranslation(J,Q,$){if(J.isVector3)this.set(1,0,0,J.x,0,1,0,J.y,0,0,1,J.z,0,0,0,1);else this.set(1,0,0,J,0,1,0,Q,0,0,1,$,0,0,0,1);return this}makeRotationX(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(1,0,0,0,0,Q,-$,0,0,$,Q,0,0,0,0,1),this}makeRotationY(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(Q,0,$,0,0,1,0,0,-$,0,Q,0,0,0,0,1),this}makeRotationZ(J){let Q=Math.cos(J),$=Math.sin(J);return this.set(Q,-$,0,0,$,Q,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(J,Q){let $=Math.cos(Q),Z=Math.sin(Q),W=1-$,K=J.x,H=J.y,Y=J.z,X=W*K,U=W*H;return this.set(X*K+$,X*H-Z*Y,X*Y+Z*H,0,X*H+Z*Y,U*H+$,U*Y-Z*K,0,X*Y-Z*H,U*Y+Z*K,W*Y*Y+$,0,0,0,0,1),this}makeScale(J,Q,$){return this.set(J,0,0,0,0,Q,0,0,0,0,$,0,0,0,0,1),this}makeShear(J,Q,$,Z,W,K){return this.set(1,$,W,0,J,1,K,0,Q,Z,1,0,0,0,0,1),this}compose(J,Q,$){let Z=this.elements,W=Q._x,K=Q._y,H=Q._z,Y=Q._w,X=W+W,U=K+K,N=H+H,q=W*X,G=W*U,E=W*N,O=K*U,R=K*N,D=H*N,F=Y*X,M=Y*U,L=Y*N,B=$.x,P=$.y,C=$.z;return Z[0]=(1-(O+D))*B,Z[1]=(G+L)*B,Z[2]=(E-M)*B,Z[3]=0,Z[4]=(G-L)*P,Z[5]=(1-(q+D))*P,Z[6]=(R+F)*P,Z[7]=0,Z[8]=(E+M)*C,Z[9]=(R-F)*C,Z[10]=(1-(q+O))*C,Z[11]=0,Z[12]=J.x,Z[13]=J.y,Z[14]=J.z,Z[15]=1,this}decompose(J,Q,$){let Z=this.elements;J.x=Z[12],J.y=Z[13],J.z=Z[14];let W=this.determinant();if(W===0)return $.set(1,1,1),Q.identity(),this;let K=n8.set(Z[0],Z[1],Z[2]).length(),H=n8.set(Z[4],Z[5],Z[6]).length(),Y=n8.set(Z[8],Z[9],Z[10]).length();if(W<0)K=-K;Y9.copy(this);let X=1/K,U=1/H,N=1/Y;return Y9.elements[0]*=X,Y9.elements[1]*=X,Y9.elements[2]*=X,Y9.elements[4]*=U,Y9.elements[5]*=U,Y9.elements[6]*=U,Y9.elements[8]*=N,Y9.elements[9]*=N,Y9.elements[10]*=N,Q.setFromRotationMatrix(Y9),$.x=K,$.y=H,$.z=Y,this}makePerspective(J,Q,$,Z,W,K,H=2000,Y=!1){let X=this.elements,U=2*W/(Q-J),N=2*W/($-Z),q=(Q+J)/(Q-J),G=($+Z)/($-Z),E,O;if(Y)E=W/(K-W),O=K*W/(K-W);else if(H===2000)E=-(K+W)/(K-W),O=-2*K*W/(K-W);else if(H===2001)E=-K/(K-W),O=-K*W/(K-W);else throw Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+H);return X[0]=U,X[4]=0,X[8]=q,X[12]=0,X[1]=0,X[5]=N,X[9]=G,X[13]=0,X[2]=0,X[6]=0,X[10]=E,X[14]=O,X[3]=0,X[7]=0,X[11]=-1,X[15]=0,this}makeOrthographic(J,Q,$,Z,W,K,H=2000,Y=!1){let X=this.elements,U=2/(Q-J),N=2/($-Z),q=-(Q+J)/(Q-J),G=-($+Z)/($-Z),E,O;if(Y)E=1/(K-W),O=K/(K-W);else if(H===2000)E=-2/(K-W),O=-(K+W)/(K-W);else if(H===2001)E=-1/(K-W),O=-W/(K-W);else throw Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+H);return X[0]=U,X[4]=0,X[8]=0,X[12]=q,X[1]=0,X[5]=N,X[9]=0,X[13]=G,X[2]=0,X[6]=0,X[10]=E,X[14]=O,X[3]=0,X[7]=0,X[11]=0,X[15]=1,this}equals(J){let Q=this.elements,$=J.elements;for(let Z=0;Z<16;Z++)if(Q[Z]!==$[Z])return!1;return!0}fromArray(J,Q=0){for(let $=0;$<16;$++)this.elements[$]=J[$+Q];return this}toArray(J=[],Q=0){let $=this.elements;return J[Q]=$[0],J[Q+1]=$[1],J[Q+2]=$[2],J[Q+3]=$[3],J[Q+4]=$[4],J[Q+5]=$[5],J[Q+6]=$[6],J[Q+7]=$[7],J[Q+8]=$[8],J[Q+9]=$[9],J[Q+10]=$[10],J[Q+11]=$[11],J[Q+12]=$[12],J[Q+13]=$[13],J[Q+14]=$[14],J[Q+15]=$[15],J}}var n8=new _,Y9=new m0,w5=new _(0,0,0),A5=new _(1,1,1),n9=new _,I6=new _,rJ=new _,fK=new m0,bK=new zJ;class J9{constructor(J=0,Q=0,$=0,Z=J9.DEFAULT_ORDER){this.isEuler=!0,this._x=J,this._y=Q,this._z=$,this._order=Z}get x(){return this._x}set x(J){this._x=J,this._onChangeCallback()}get y(){return this._y}set y(J){this._y=J,this._onChangeCallback()}get z(){return this._z}set z(J){this._z=J,this._onChangeCallback()}get order(){return this._order}set order(J){this._order=J,this._onChangeCallback()}set(J,Q,$,Z=this._order){return this._x=J,this._y=Q,this._z=$,this._order=Z,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(J){return this._x=J._x,this._y=J._y,this._z=J._z,this._order=J._order,this._onChangeCallback(),this}setFromRotationMatrix(J,Q=this._order,$=!0){let Z=J.elements,W=Z[0],K=Z[4],H=Z[8],Y=Z[1],X=Z[5],U=Z[9],N=Z[2],q=Z[6],G=Z[10];switch(Q){case"XYZ":if(this._y=Math.asin(p0(H,-1,1)),Math.abs(H)<0.9999999)this._x=Math.atan2(-U,G),this._z=Math.atan2(-K,W);else this._x=Math.atan2(q,X),this._z=0;break;case"YXZ":if(this._x=Math.asin(-p0(U,-1,1)),Math.abs(U)<0.9999999)this._y=Math.atan2(H,G),this._z=Math.atan2(Y,X);else this._y=Math.atan2(-N,W),this._z=0;break;case"ZXY":if(this._x=Math.asin(p0(q,-1,1)),Math.abs(q)<0.9999999)this._y=Math.atan2(-N,G),this._z=Math.atan2(-K,X);else this._y=0,this._z=Math.atan2(Y,W);break;case"ZYX":if(this._y=Math.asin(-p0(N,-1,1)),Math.abs(N)<0.9999999)this._x=Math.atan2(q,G),this._z=Math.atan2(Y,W);else this._x=0,this._z=Math.atan2(-K,X);break;case"YZX":if(this._z=Math.asin(p0(Y,-1,1)),Math.abs(Y)<0.9999999)this._x=Math.atan2(-U,X),this._y=Math.atan2(-N,W);else this._x=0,this._y=Math.atan2(H,G);break;case"XZY":if(this._z=Math.asin(-p0(K,-1,1)),Math.abs(K)<0.9999999)this._x=Math.atan2(q,X),this._y=Math.atan2(H,W);else this._x=Math.atan2(-U,G),this._y=0;break;default:q0("Euler: .setFromRotationMatrix() encountered an unknown order: "+Q)}if(this._order=Q,$===!0)this._onChangeCallback();return this}setFromQuaternion(J,Q,$){return fK.makeRotationFromQuaternion(J),this.setFromRotationMatrix(fK,Q,$)}setFromVector3(J,Q=this._order){return this.set(J.x,J.y,J.z,Q)}reorder(J){return bK.setFromEuler(this),this.setFromQuaternion(bK,J)}equals(J){return J._x===this._x&&J._y===this._y&&J._z===this._z&&J._order===this._order}fromArray(J){if(this._x=J[0],this._y=J[1],this._z=J[2],J[3]!==void 0)this._order=J[3];return this._onChangeCallback(),this}toArray(J=[],Q=0){return J[Q]=this._x,J[Q+1]=this._y,J[Q+2]=this._z,J[Q+3]=this._order,J}_onChange(J){return this._onChangeCallback=J,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}J9.DEFAULT_ORDER="XYZ";class Y6{constructor(){this.mask=1}set(J){this.mask=(1<<J|0)>>>0}enable(J){this.mask|=1<<J|0}enableAll(){this.mask=-1}toggle(J){this.mask^=1<<J|0}disable(J){this.mask&=~(1<<J|0)}disableAll(){this.mask=0}test(J){return(this.mask&J.mask)!==0}isEnabled(J){return(this.mask&(1<<J|0))!==0}}var _5=0,vK=new _,s8=new zJ,P9=new m0,C6=new _,S7=new _,P5=new _,T5=new zJ,hK=new _(1,0,0),xK=new _(0,1,0),gK=new _(0,0,1),pK={type:"added"},S5={type:"removed"},i8={type:"childadded",child:null},w$={type:"childremoved",child:null};class $J extends F9{constructor(){super();this.isObject3D=!0,Object.defineProperty(this,"id",{value:_5++}),this.uuid=eJ(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=$J.DEFAULT_UP.clone();let J=new _,Q=new J9,$=new zJ,Z=new _(1,1,1);function W(){$.setFromEuler(Q,!1)}function K(){Q.setFromQuaternion($,void 0,!1)}Q._onChange(W),$._onChange(K),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:J},rotation:{configurable:!0,enumerable:!0,value:Q},quaternion:{configurable:!0,enumerable:!0,value:$},scale:{configurable:!0,enumerable:!0,value:Z},modelViewMatrix:{value:new m0},normalMatrix:{value:new n0}}),this.matrix=new m0,this.matrixWorld=new m0,this.matrixAutoUpdate=$J.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=$J.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new Y6,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(J){if(this.matrixAutoUpdate)this.updateMatrix();this.matrix.premultiply(J),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(J){return this.quaternion.premultiply(J),this}setRotationFromAxisAngle(J,Q){this.quaternion.setFromAxisAngle(J,Q)}setRotationFromEuler(J){this.quaternion.setFromEuler(J,!0)}setRotationFromMatrix(J){this.quaternion.setFromRotationMatrix(J)}setRotationFromQuaternion(J){this.quaternion.copy(J)}rotateOnAxis(J,Q){return s8.setFromAxisAngle(J,Q),this.quaternion.multiply(s8),this}rotateOnWorldAxis(J,Q){return s8.setFromAxisAngle(J,Q),this.quaternion.premultiply(s8),this}rotateX(J){return this.rotateOnAxis(hK,J)}rotateY(J){return this.rotateOnAxis(xK,J)}rotateZ(J){return this.rotateOnAxis(gK,J)}translateOnAxis(J,Q){return vK.copy(J).applyQuaternion(this.quaternion),this.position.add(vK.multiplyScalar(Q)),this}translateX(J){return this.translateOnAxis(hK,J)}translateY(J){return this.translateOnAxis(xK,J)}translateZ(J){return this.translateOnAxis(gK,J)}localToWorld(J){return this.updateWorldMatrix(!0,!1),J.applyMatrix4(this.matrixWorld)}worldToLocal(J){return this.updateWorldMatrix(!0,!1),J.applyMatrix4(P9.copy(this.matrixWorld).invert())}lookAt(J,Q,$){if(J.isVector3)C6.copy(J);else C6.set(J,Q,$);let Z=this.parent;if(this.updateWorldMatrix(!0,!1),S7.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight)P9.lookAt(S7,C6,this.up);else P9.lookAt(C6,S7,this.up);if(this.quaternion.setFromRotationMatrix(P9),Z)P9.extractRotation(Z.matrixWorld),s8.setFromRotationMatrix(P9),this.quaternion.premultiply(s8.invert())}add(J){if(arguments.length>1){for(let Q=0;Q<arguments.length;Q++)this.add(arguments[Q]);return this}if(J===this)return j0("Object3D.add: object can't be added as a child of itself.",J),this;if(J&&J.isObject3D)J.removeFromParent(),J.parent=this,this.children.push(J),J.dispatchEvent(pK),i8.child=J,this.dispatchEvent(i8),i8.child=null;else j0("Object3D.add: object not an instance of THREE.Object3D.",J);return this}remove(J){if(arguments.length>1){for(let $=0;$<arguments.length;$++)this.remove(arguments[$]);return this}let Q=this.children.indexOf(J);if(Q!==-1)J.parent=null,this.children.splice(Q,1),J.dispatchEvent(S5),w$.child=J,this.dispatchEvent(w$),w$.child=null;return this}removeFromParent(){let J=this.parent;if(J!==null)J.remove(this);return this}clear(){return this.remove(...this.children)}attach(J){if(this.updateWorldMatrix(!0,!1),P9.copy(this.matrixWorld).invert(),J.parent!==null)J.parent.updateWorldMatrix(!0,!1),P9.multiply(J.parent.matrixWorld);return J.applyMatrix4(P9),J.removeFromParent(),J.parent=this,this.children.push(J),J.updateWorldMatrix(!1,!0),J.dispatchEvent(pK),i8.child=J,this.dispatchEvent(i8),i8.child=null,this}getObjectById(J){return this.getObjectByProperty("id",J)}getObjectByName(J){return this.getObjectByProperty("name",J)}getObjectByProperty(J,Q){if(this[J]===Q)return this;for(let $=0,Z=this.children.length;$<Z;$++){let K=this.children[$].getObjectByProperty(J,Q);if(K!==void 0)return K}return}getObjectsByProperty(J,Q,$=[]){if(this[J]===Q)$.push(this);let Z=this.children;for(let W=0,K=Z.length;W<K;W++)Z[W].getObjectsByProperty(J,Q,$);return $}getWorldPosition(J){return this.updateWorldMatrix(!0,!1),J.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(J){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(S7,J,P5),J}getWorldScale(J){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(S7,T5,J),J}getWorldDirection(J){this.updateWorldMatrix(!0,!1);let Q=this.matrixWorld.elements;return J.set(Q[8],Q[9],Q[10]).normalize()}raycast(){}traverse(J){J(this);let Q=this.children;for(let $=0,Z=Q.length;$<Z;$++)Q[$].traverse(J)}traverseVisible(J){if(this.visible===!1)return;J(this);let Q=this.children;for(let $=0,Z=Q.length;$<Z;$++)Q[$].traverseVisible(J)}traverseAncestors(J){let Q=this.parent;if(Q!==null)J(Q),Q.traverseAncestors(J)}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let J=this.pivot;if(J!==null){let{x:Q,y:$,z:Z}=J,W=this.matrix.elements;W[12]+=Q-W[0]*Q-W[4]*$-W[8]*Z,W[13]+=$-W[1]*Q-W[5]*$-W[9]*Z,W[14]+=Z-W[2]*Q-W[6]*$-W[10]*Z}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(J){if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldNeedsUpdate||J){if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);this.matrixWorldNeedsUpdate=!1,J=!0}let Q=this.children;for(let $=0,Z=Q.length;$<Z;$++)Q[$].updateMatrixWorld(J)}updateWorldMatrix(J,Q){let $=this.parent;if(J===!0&&$!==null)$.updateWorldMatrix(!0,!1);if(this.matrixAutoUpdate)this.updateMatrix();if(this.matrixWorldAutoUpdate===!0)if(this.parent===null)this.matrixWorld.copy(this.matrix);else this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);if(Q===!0){let Z=this.children;for(let W=0,K=Z.length;W<K;W++)Z[W].updateWorldMatrix(!1,!0)}}toJSON(J){let Q=J===void 0||typeof J==="string",$={};if(Q)J={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},$.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"};let Z={};if(Z.uuid=this.uuid,Z.type=this.type,this.name!=="")Z.name=this.name;if(this.castShadow===!0)Z.castShadow=!0;if(this.receiveShadow===!0)Z.receiveShadow=!0;if(this.visible===!1)Z.visible=!1;if(this.frustumCulled===!1)Z.frustumCulled=!1;if(this.renderOrder!==0)Z.renderOrder=this.renderOrder;if(this.static!==!1)Z.static=this.static;if(Object.keys(this.userData).length>0)Z.userData=this.userData;if(Z.layers=this.layers.mask,Z.matrix=this.matrix.toArray(),Z.up=this.up.toArray(),this.pivot!==null)Z.pivot=this.pivot.toArray();if(this.matrixAutoUpdate===!1)Z.matrixAutoUpdate=!1;if(this.morphTargetDictionary!==void 0)Z.morphTargetDictionary=Object.assign({},this.morphTargetDictionary);if(this.morphTargetInfluences!==void 0)Z.morphTargetInfluences=this.morphTargetInfluences.slice();if(this.isInstancedMesh){if(Z.type="InstancedMesh",Z.count=this.count,Z.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null)Z.instanceColor=this.instanceColor.toJSON()}if(this.isBatchedMesh){if(Z.type="BatchedMesh",Z.perObjectFrustumCulled=this.perObjectFrustumCulled,Z.sortObjects=this.sortObjects,Z.drawRanges=this._drawRanges,Z.reservedRanges=this._reservedRanges,Z.geometryInfo=this._geometryInfo.map((H)=>({...H,boundingBox:H.boundingBox?H.boundingBox.toJSON():void 0,boundingSphere:H.boundingSphere?H.boundingSphere.toJSON():void 0})),Z.instanceInfo=this._instanceInfo.map((H)=>({...H})),Z.availableInstanceIds=this._availableInstanceIds.slice(),Z.availableGeometryIds=this._availableGeometryIds.slice(),Z.nextIndexStart=this._nextIndexStart,Z.nextVertexStart=this._nextVertexStart,Z.geometryCount=this._geometryCount,Z.maxInstanceCount=this._maxInstanceCount,Z.maxVertexCount=this._maxVertexCount,Z.maxIndexCount=this._maxIndexCount,Z.geometryInitialized=this._geometryInitialized,Z.matricesTexture=this._matricesTexture.toJSON(J),Z.indirectTexture=this._indirectTexture.toJSON(J),this._colorsTexture!==null)Z.colorsTexture=this._colorsTexture.toJSON(J);if(this.boundingSphere!==null)Z.boundingSphere=this.boundingSphere.toJSON();if(this.boundingBox!==null)Z.boundingBox=this.boundingBox.toJSON()}function W(H,Y){if(H[Y.uuid]===void 0)H[Y.uuid]=Y.toJSON(J);return Y.uuid}if(this.isScene){if(this.background){if(this.background.isColor)Z.background=this.background.toJSON();else if(this.background.isTexture)Z.background=this.background.toJSON(J).uuid}if(this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0)Z.environment=this.environment.toJSON(J).uuid}else if(this.isMesh||this.isLine||this.isPoints){Z.geometry=W(J.geometries,this.geometry);let H=this.geometry.parameters;if(H!==void 0&&H.shapes!==void 0){let Y=H.shapes;if(Array.isArray(Y))for(let X=0,U=Y.length;X<U;X++){let N=Y[X];W(J.shapes,N)}else W(J.shapes,Y)}}if(this.isSkinnedMesh){if(Z.bindMode=this.bindMode,Z.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0)W(J.skeletons,this.skeleton),Z.skeleton=this.skeleton.uuid}if(this.material!==void 0)if(Array.isArray(this.material)){let H=[];for(let Y=0,X=this.material.length;Y<X;Y++)H.push(W(J.materials,this.material[Y]));Z.material=H}else Z.material=W(J.materials,this.material);if(this.children.length>0){Z.children=[];for(let H=0;H<this.children.length;H++)Z.children.push(this.children[H].toJSON(J).object)}if(this.animations.length>0){Z.animations=[];for(let H=0;H<this.animations.length;H++){let Y=this.animations[H];Z.animations.push(W(J.animations,Y))}}if(Q){let H=K(J.geometries),Y=K(J.materials),X=K(J.textures),U=K(J.images),N=K(J.shapes),q=K(J.skeletons),G=K(J.animations),E=K(J.nodes);if(H.length>0)$.geometries=H;if(Y.length>0)$.materials=Y;if(X.length>0)$.textures=X;if(U.length>0)$.images=U;if(N.length>0)$.shapes=N;if(q.length>0)$.skeletons=q;if(G.length>0)$.animations=G;if(E.length>0)$.nodes=E}return $.object=Z,$;function K(H){let Y=[];for(let X in H){let U=H[X];delete U.metadata,Y.push(U)}return Y}}clone(J){return new this.constructor().copy(this,J)}copy(J,Q=!0){if(this.name=J.name,this.up.copy(J.up),this.position.copy(J.position),this.rotation.order=J.rotation.order,this.quaternion.copy(J.quaternion),this.scale.copy(J.scale),J.pivot!==null)this.pivot=J.pivot.clone();if(this.matrix.copy(J.matrix),this.matrixWorld.copy(J.matrixWorld),this.matrixAutoUpdate=J.matrixAutoUpdate,this.matrixWorldAutoUpdate=J.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=J.matrixWorldNeedsUpdate,this.layers.mask=J.layers.mask,this.visible=J.visible,this.castShadow=J.castShadow,this.receiveShadow=J.receiveShadow,this.frustumCulled=J.frustumCulled,this.renderOrder=J.renderOrder,this.static=J.static,this.animations=J.animations.slice(),this.userData=JSON.parse(JSON.stringify(J.userData)),Q===!0)for(let $=0;$<J.children.length;$++){let Z=J.children[$];this.add(Z.clone())}return this}}$J.DEFAULT_UP=new _(0,1,0);$J.DEFAULT_MATRIX_AUTO_UPDATE=!0;$J.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;class z8 extends $J{constructor(){super();this.isGroup=!0,this.type="Group"}}var j5={type:"move"};class X6{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){if(this._hand===null)this._hand=new z8,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1};return this._hand}getTargetRaySpace(){if(this._targetRay===null)this._targetRay=new z8,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new _,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new _;return this._targetRay}getGripSpace(){if(this._grip===null)this._grip=new z8,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new _,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new _;return this._grip}dispatchEvent(J){if(this._targetRay!==null)this._targetRay.dispatchEvent(J);if(this._grip!==null)this._grip.dispatchEvent(J);if(this._hand!==null)this._hand.dispatchEvent(J);return this}connect(J){if(J&&J.hand){let Q=this._hand;if(Q)for(let $ of J.hand.values())this._getHandJoint(Q,$)}return this.dispatchEvent({type:"connected",data:J}),this}disconnect(J){if(this.dispatchEvent({type:"disconnected",data:J}),this._targetRay!==null)this._targetRay.visible=!1;if(this._grip!==null)this._grip.visible=!1;if(this._hand!==null)this._hand.visible=!1;return this}update(J,Q,$){let Z=null,W=null,K=null,H=this._targetRay,Y=this._grip,X=this._hand;if(J&&Q.session.visibilityState!=="visible-blurred"){if(X&&J.hand){K=!0;for(let O of J.hand.values()){let R=Q.getJointPose(O,$),D=this._getHandJoint(X,O);if(R!==null)D.matrix.fromArray(R.transform.matrix),D.matrix.decompose(D.position,D.rotation,D.scale),D.matrixWorldNeedsUpdate=!0,D.jointRadius=R.radius;D.visible=R!==null}let U=X.joints["index-finger-tip"],N=X.joints["thumb-tip"],q=U.position.distanceTo(N.position),G=0.02,E=0.005;if(X.inputState.pinching&&q>G+E)X.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:J.handedness,target:this});else if(!X.inputState.pinching&&q<=G-E)X.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:J.handedness,target:this})}else if(Y!==null&&J.gripSpace){if(W=Q.getPose(J.gripSpace,$),W!==null){if(Y.matrix.fromArray(W.transform.matrix),Y.matrix.decompose(Y.position,Y.rotation,Y.scale),Y.matrixWorldNeedsUpdate=!0,W.linearVelocity)Y.hasLinearVelocity=!0,Y.linearVelocity.copy(W.linearVelocity);else Y.hasLinearVelocity=!1;if(W.angularVelocity)Y.hasAngularVelocity=!0,Y.angularVelocity.copy(W.angularVelocity);else Y.hasAngularVelocity=!1}}if(H!==null){if(Z=Q.getPose(J.targetRaySpace,$),Z===null&&W!==null)Z=W;if(Z!==null){if(H.matrix.fromArray(Z.transform.matrix),H.matrix.decompose(H.position,H.rotation,H.scale),H.matrixWorldNeedsUpdate=!0,Z.linearVelocity)H.hasLinearVelocity=!0,H.linearVelocity.copy(Z.linearVelocity);else H.hasLinearVelocity=!1;if(Z.angularVelocity)H.hasAngularVelocity=!0,H.angularVelocity.copy(Z.angularVelocity);else H.hasAngularVelocity=!1;this.dispatchEvent(j5)}}}if(H!==null)H.visible=Z!==null;if(Y!==null)Y.visible=W!==null;if(X!==null)X.visible=K!==null;return this}_getHandJoint(J,Q){if(J.joints[Q.jointName]===void 0){let $=new z8;$.matrixAutoUpdate=!1,$.visible=!1,J.joints[Q.jointName]=$,J.add($)}return J.joints[Q.jointName]}}var dY={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},s9={h:0,s:0,l:0},w6={h:0,s:0,l:0};function A$(J,Q,$){if($<0)$+=1;if($>1)$-=1;if($<0.16666666666666666)return J+(Q-J)*6*$;if($<0.5)return Q;if($<0.6666666666666666)return J+(Q-J)*6*(0.6666666666666666-$);return J}class M0{constructor(J,Q,$){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(J,Q,$)}set(J,Q,$){if(Q===void 0&&$===void 0){let Z=J;if(Z&&Z.isColor)this.copy(Z);else if(typeof Z==="number")this.setHex(Z);else if(typeof Z==="string")this.setStyle(Z)}else this.setRGB(J,Q,$);return this}setScalar(J){return this.r=J,this.g=J,this.b=J,this}setHex(J,Q="srgb"){return J=Math.floor(J),this.r=(J>>16&255)/255,this.g=(J>>8&255)/255,this.b=(J&255)/255,JJ.colorSpaceToWorking(this,Q),this}setRGB(J,Q,$,Z=JJ.workingColorSpace){return this.r=J,this.g=Q,this.b=$,JJ.colorSpaceToWorking(this,Z),this}setHSL(J,Q,$,Z=JJ.workingColorSpace){if(J=UW(J,1),Q=p0(Q,0,1),$=p0($,0,1),Q===0)this.r=this.g=this.b=$;else{let W=$<=0.5?$*(1+Q):$+Q-$*Q,K=2*$-W;this.r=A$(K,W,J+0.3333333333333333),this.g=A$(K,W,J),this.b=A$(K,W,J-0.3333333333333333)}return JJ.colorSpaceToWorking(this,Z),this}setStyle(J,Q="srgb"){function $(W){if(W===void 0)return;if(parseFloat(W)<1)q0("Color: Alpha component of "+J+" will be ignored.")}let Z;if(Z=/^(\w+)\(([^\)]*)\)/.exec(J)){let W,K=Z[1],H=Z[2];switch(K){case"rgb":case"rgba":if(W=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(H))return $(W[4]),this.setRGB(Math.min(255,parseInt(W[1],10))/255,Math.min(255,parseInt(W[2],10))/255,Math.min(255,parseInt(W[3],10))/255,Q);if(W=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(H))return $(W[4]),this.setRGB(Math.min(100,parseInt(W[1],10))/100,Math.min(100,parseInt(W[2],10))/100,Math.min(100,parseInt(W[3],10))/100,Q);break;case"hsl":case"hsla":if(W=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(H))return $(W[4]),this.setHSL(parseFloat(W[1])/360,parseFloat(W[2])/100,parseFloat(W[3])/100,Q);break;default:q0("Color: Unknown color model "+J)}}else if(Z=/^\#([A-Fa-f\d]+)$/.exec(J)){let W=Z[1],K=W.length;if(K===3)return this.setRGB(parseInt(W.charAt(0),16)/15,parseInt(W.charAt(1),16)/15,parseInt(W.charAt(2),16)/15,Q);else if(K===6)return this.setHex(parseInt(W,16),Q);else q0("Color: Invalid hex color "+J)}else if(J&&J.length>0)return this.setColorName(J,Q);return this}setColorName(J,Q="srgb"){let $=dY[J.toLowerCase()];if($!==void 0)this.setHex($,Q);else q0("Color: Unknown color "+J);return this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(J){return this.r=J.r,this.g=J.g,this.b=J.b,this}copySRGBToLinear(J){return this.r=h9(J.r),this.g=h9(J.g),this.b=h9(J.b),this}copyLinearToSRGB(J){return this.r=q7(J.r),this.g=q7(J.g),this.b=q7(J.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(J="srgb"){return JJ.workingToColorSpace(vJ.copy(this),J),Math.round(p0(vJ.r*255,0,255))*65536+Math.round(p0(vJ.g*255,0,255))*256+Math.round(p0(vJ.b*255,0,255))}getHexString(J="srgb"){return("000000"+this.getHex(J).toString(16)).slice(-6)}getHSL(J,Q=JJ.workingColorSpace){JJ.workingToColorSpace(vJ.copy(this),Q);let{r:$,g:Z,b:W}=vJ,K=Math.max($,Z,W),H=Math.min($,Z,W),Y,X,U=(H+K)/2;if(H===K)Y=0,X=0;else{let N=K-H;switch(X=U<=0.5?N/(K+H):N/(2-K-H),K){case $:Y=(Z-W)/N+(Z<W?6:0);break;case Z:Y=(W-$)/N+2;break;case W:Y=($-Z)/N+4;break}Y/=6}return J.h=Y,J.s=X,J.l=U,J}getRGB(J,Q=JJ.workingColorSpace){return JJ.workingToColorSpace(vJ.copy(this),Q),J.r=vJ.r,J.g=vJ.g,J.b=vJ.b,J}getStyle(J="srgb"){JJ.workingToColorSpace(vJ.copy(this),J);let{r:Q,g:$,b:Z}=vJ;if(J!=="srgb")return`color(${J} ${Q.toFixed(3)} ${$.toFixed(3)} ${Z.toFixed(3)})`;return`rgb(${Math.round(Q*255)},${Math.round($*255)},${Math.round(Z*255)})`}offsetHSL(J,Q,$){return this.getHSL(s9),this.setHSL(s9.h+J,s9.s+Q,s9.l+$)}add(J){return this.r+=J.r,this.g+=J.g,this.b+=J.b,this}addColors(J,Q){return this.r=J.r+Q.r,this.g=J.g+Q.g,this.b=J.b+Q.b,this}addScalar(J){return this.r+=J,this.g+=J,this.b+=J,this}sub(J){return this.r=Math.max(0,this.r-J.r),this.g=Math.max(0,this.g-J.g),this.b=Math.max(0,this.b-J.b),this}multiply(J){return this.r*=J.r,this.g*=J.g,this.b*=J.b,this}multiplyScalar(J){return this.r*=J,this.g*=J,this.b*=J,this}lerp(J,Q){return this.r+=(J.r-this.r)*Q,this.g+=(J.g-this.g)*Q,this.b+=(J.b-this.b)*Q,this}lerpColors(J,Q,$){return this.r=J.r+(Q.r-J.r)*$,this.g=J.g+(Q.g-J.g)*$,this.b=J.b+(Q.b-J.b)*$,this}lerpHSL(J,Q){this.getHSL(s9),J.getHSL(w6);let $=u7(s9.h,w6.h,Q),Z=u7(s9.s,w6.s,Q),W=u7(s9.l,w6.l,Q);return this.setHSL($,Z,W),this}setFromVector3(J){return this.r=J.x,this.g=J.y,this.b=J.z,this}applyMatrix3(J){let Q=this.r,$=this.g,Z=this.b,W=J.elements;return this.r=W[0]*Q+W[3]*$+W[6]*Z,this.g=W[1]*Q+W[4]*$+W[7]*Z,this.b=W[2]*Q+W[5]*$+W[8]*Z,this}equals(J){return J.r===this.r&&J.g===this.g&&J.b===this.b}fromArray(J,Q=0){return this.r=J[Q],this.g=J[Q+1],this.b=J[Q+2],this}toArray(J=[],Q=0){return J[Q]=this.r,J[Q+1]=this.g,J[Q+2]=this.b,J}fromBufferAttribute(J,Q){return this.r=J.getX(Q),this.g=J.getY(Q),this.b=J.getZ(Q),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}var vJ=new M0;M0.NAMES=dY;class PQ{constructor(J,Q=0.00025){this.isFogExp2=!0,this.name="",this.color=new M0(J),this.density=Q}clone(){return new PQ(this.color,this.density)}toJSON(){return{type:"FogExp2",name:this.name,color:this.color.getHex(),density:this.density}}}class TQ{constructor(J,Q=1,$=1000){this.isFog=!0,this.name="",this.color=new M0(J),this.near=Q,this.far=$}clone(){return new TQ(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class qW extends $J{constructor(){super();if(this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new J9,this.environmentIntensity=1,this.environmentRotation=new J9,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(J,Q){if(super.copy(J,Q),J.background!==null)this.background=J.background.clone();if(J.environment!==null)this.environment=J.environment.clone();if(J.fog!==null)this.fog=J.fog.clone();if(this.backgroundBlurriness=J.backgroundBlurriness,this.backgroundIntensity=J.backgroundIntensity,this.backgroundRotation.copy(J.backgroundRotation),this.environmentIntensity=J.environmentIntensity,this.environmentRotation.copy(J.environmentRotation),J.overrideMaterial!==null)this.overrideMaterial=J.overrideMaterial.clone();return this.matrixAutoUpdate=J.matrixAutoUpdate,this}toJSON(J){let Q=super.toJSON(J);if(this.fog!==null)Q.object.fog=this.fog.toJSON();if(this.backgroundBlurriness>0)Q.object.backgroundBlurriness=this.backgroundBlurriness;if(this.backgroundIntensity!==1)Q.object.backgroundIntensity=this.backgroundIntensity;if(Q.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1)Q.object.environmentIntensity=this.environmentIntensity;return Q.object.environmentRotation=this.environmentRotation.toArray(),Q}}var X9=new _,T9=new _,_$=new _,S9=new _,o8=new _,a8=new _,mK=new _,P$=new _,T$=new _,S$=new _,j$=new qJ,y$=new qJ,f$=new qJ;class cJ{constructor(J=new _,Q=new _,$=new _){this.a=J,this.b=Q,this.c=$}static getNormal(J,Q,$,Z){Z.subVectors($,Q),X9.subVectors(J,Q),Z.cross(X9);let W=Z.lengthSq();if(W>0)return Z.multiplyScalar(1/Math.sqrt(W));return Z.set(0,0,0)}static getBarycoord(J,Q,$,Z,W){X9.subVectors(Z,Q),T9.subVectors($,Q),_$.subVectors(J,Q);let K=X9.dot(X9),H=X9.dot(T9),Y=X9.dot(_$),X=T9.dot(T9),U=T9.dot(_$),N=K*X-H*H;if(N===0)return W.set(0,0,0),null;let q=1/N,G=(X*Y-H*U)*q,E=(K*U-H*Y)*q;return W.set(1-G-E,E,G)}static containsPoint(J,Q,$,Z){if(this.getBarycoord(J,Q,$,Z,S9)===null)return!1;return S9.x>=0&&S9.y>=0&&S9.x+S9.y<=1}static getInterpolation(J,Q,$,Z,W,K,H,Y){if(this.getBarycoord(J,Q,$,Z,S9)===null){if(Y.x=0,Y.y=0,"z"in Y)Y.z=0;if("w"in Y)Y.w=0;return null}return Y.setScalar(0),Y.addScaledVector(W,S9.x),Y.addScaledVector(K,S9.y),Y.addScaledVector(H,S9.z),Y}static getInterpolatedAttribute(J,Q,$,Z,W,K){return j$.setScalar(0),y$.setScalar(0),f$.setScalar(0),j$.fromBufferAttribute(J,Q),y$.fromBufferAttribute(J,$),f$.fromBufferAttribute(J,Z),K.setScalar(0),K.addScaledVector(j$,W.x),K.addScaledVector(y$,W.y),K.addScaledVector(f$,W.z),K}static isFrontFacing(J,Q,$,Z){return X9.subVectors($,Q),T9.subVectors(J,Q),X9.cross(T9).dot(Z)<0?!0:!1}set(J,Q,$){return this.a.copy(J),this.b.copy(Q),this.c.copy($),this}setFromPointsAndIndices(J,Q,$,Z){return this.a.copy(J[Q]),this.b.copy(J[$]),this.c.copy(J[Z]),this}setFromAttributeAndIndices(J,Q,$,Z){return this.a.fromBufferAttribute(J,Q),this.b.fromBufferAttribute(J,$),this.c.fromBufferAttribute(J,Z),this}clone(){return new this.constructor().copy(this)}copy(J){return this.a.copy(J.a),this.b.copy(J.b),this.c.copy(J.c),this}getArea(){return X9.subVectors(this.c,this.b),T9.subVectors(this.a,this.b),X9.cross(T9).length()*0.5}getMidpoint(J){return J.addVectors(this.a,this.b).add(this.c).multiplyScalar(0.3333333333333333)}getNormal(J){return cJ.getNormal(this.a,this.b,this.c,J)}getPlane(J){return J.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(J,Q){return cJ.getBarycoord(J,this.a,this.b,this.c,Q)}getInterpolation(J,Q,$,Z,W){return cJ.getInterpolation(J,this.a,this.b,this.c,Q,$,Z,W)}containsPoint(J){return cJ.containsPoint(J,this.a,this.b,this.c)}isFrontFacing(J){return cJ.isFrontFacing(this.a,this.b,this.c,J)}intersectsBox(J){return J.intersectsTriangle(this)}closestPointToPoint(J,Q){let $=this.a,Z=this.b,W=this.c,K,H;o8.subVectors(Z,$),a8.subVectors(W,$),P$.subVectors(J,$);let Y=o8.dot(P$),X=a8.dot(P$);if(Y<=0&&X<=0)return Q.copy($);T$.subVectors(J,Z);let U=o8.dot(T$),N=a8.dot(T$);if(U>=0&&N<=U)return Q.copy(Z);let q=Y*N-U*X;if(q<=0&&Y>=0&&U<=0)return K=Y/(Y-U),Q.copy($).addScaledVector(o8,K);S$.subVectors(J,W);let G=o8.dot(S$),E=a8.dot(S$);if(E>=0&&G<=E)return Q.copy(W);let O=G*X-Y*E;if(O<=0&&X>=0&&E<=0)return H=X/(X-E),Q.copy($).addScaledVector(a8,H);let R=U*E-G*N;if(R<=0&&N-U>=0&&G-E>=0)return mK.subVectors(W,Z),H=(N-U)/(N-U+(G-E)),Q.copy(Z).addScaledVector(mK,H);let D=1/(R+O+q);return K=O*D,H=q*D,Q.copy($).addScaledVector(o8,K).addScaledVector(a8,H)}equals(J){return J.a.equals(this.a)&&J.b.equals(this.b)&&J.c.equals(this.c)}}class jJ{constructor(J=new _(1/0,1/0,1/0),Q=new _(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=J,this.max=Q}set(J,Q){return this.min.copy(J),this.max.copy(Q),this}setFromArray(J){this.makeEmpty();for(let Q=0,$=J.length;Q<$;Q+=3)this.expandByPoint(U9.fromArray(J,Q));return this}setFromBufferAttribute(J){this.makeEmpty();for(let Q=0,$=J.count;Q<$;Q++)this.expandByPoint(U9.fromBufferAttribute(J,Q));return this}setFromPoints(J){this.makeEmpty();for(let Q=0,$=J.length;Q<$;Q++)this.expandByPoint(J[Q]);return this}setFromCenterAndSize(J,Q){let $=U9.copy(Q).multiplyScalar(0.5);return this.min.copy(J).sub($),this.max.copy(J).add($),this}setFromObject(J,Q=!1){return this.makeEmpty(),this.expandByObject(J,Q)}clone(){return new this.constructor().copy(this)}copy(J){return this.min.copy(J.min),this.max.copy(J.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(J){return this.isEmpty()?J.set(0,0,0):J.addVectors(this.min,this.max).multiplyScalar(0.5)}getSize(J){return this.isEmpty()?J.set(0,0,0):J.subVectors(this.max,this.min)}expandByPoint(J){return this.min.min(J),this.max.max(J),this}expandByVector(J){return this.min.sub(J),this.max.add(J),this}expandByScalar(J){return this.min.addScalar(-J),this.max.addScalar(J),this}expandByObject(J,Q=!1){J.updateWorldMatrix(!1,!1);let $=J.geometry;if($!==void 0){let W=$.getAttribute("position");if(Q===!0&&W!==void 0&&J.isInstancedMesh!==!0)for(let K=0,H=W.count;K<H;K++){if(J.isMesh===!0)J.getVertexPosition(K,U9);else U9.fromBufferAttribute(W,K);U9.applyMatrix4(J.matrixWorld),this.expandByPoint(U9)}else{if(J.boundingBox!==void 0){if(J.boundingBox===null)J.computeBoundingBox();A6.copy(J.boundingBox)}else{if($.boundingBox===null)$.computeBoundingBox();A6.copy($.boundingBox)}A6.applyMatrix4(J.matrixWorld),this.union(A6)}}let Z=J.children;for(let W=0,K=Z.length;W<K;W++)this.expandByObject(Z[W],Q);return this}containsPoint(J){return J.x>=this.min.x&&J.x<=this.max.x&&J.y>=this.min.y&&J.y<=this.max.y&&J.z>=this.min.z&&J.z<=this.max.z}containsBox(J){return this.min.x<=J.min.x&&J.max.x<=this.max.x&&this.min.y<=J.min.y&&J.max.y<=this.max.y&&this.min.z<=J.min.z&&J.max.z<=this.max.z}getParameter(J,Q){return Q.set((J.x-this.min.x)/(this.max.x-this.min.x),(J.y-this.min.y)/(this.max.y-this.min.y),(J.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(J){return J.max.x>=this.min.x&&J.min.x<=this.max.x&&J.max.y>=this.min.y&&J.min.y<=this.max.y&&J.max.z>=this.min.z&&J.min.z<=this.max.z}intersectsSphere(J){return this.clampPoint(J.center,U9),U9.distanceToSquared(J.center)<=J.radius*J.radius}intersectsPlane(J){let Q,$;if(J.normal.x>0)Q=J.normal.x*this.min.x,$=J.normal.x*this.max.x;else Q=J.normal.x*this.max.x,$=J.normal.x*this.min.x;if(J.normal.y>0)Q+=J.normal.y*this.min.y,$+=J.normal.y*this.max.y;else Q+=J.normal.y*this.max.y,$+=J.normal.y*this.min.y;if(J.normal.z>0)Q+=J.normal.z*this.min.z,$+=J.normal.z*this.max.z;else Q+=J.normal.z*this.max.z,$+=J.normal.z*this.min.z;return Q<=-J.constant&&$>=-J.constant}intersectsTriangle(J){if(this.isEmpty())return!1;this.getCenter(j7),_6.subVectors(this.max,j7),r8.subVectors(J.a,j7),t8.subVectors(J.b,j7),e8.subVectors(J.c,j7),i9.subVectors(t8,r8),o9.subVectors(e8,t8),N8.subVectors(r8,e8);let Q=[0,-i9.z,i9.y,0,-o9.z,o9.y,0,-N8.z,N8.y,i9.z,0,-i9.x,o9.z,0,-o9.x,N8.z,0,-N8.x,-i9.y,i9.x,0,-o9.y,o9.x,0,-N8.y,N8.x,0];if(!b$(Q,r8,t8,e8,_6))return!1;if(Q=[1,0,0,0,1,0,0,0,1],!b$(Q,r8,t8,e8,_6))return!1;return P6.crossVectors(i9,o9),Q=[P6.x,P6.y,P6.z],b$(Q,r8,t8,e8,_6)}clampPoint(J,Q){return Q.copy(J).clamp(this.min,this.max)}distanceToPoint(J){return this.clampPoint(J,U9).distanceTo(J)}getBoundingSphere(J){if(this.isEmpty())J.makeEmpty();else this.getCenter(J.center),J.radius=this.getSize(U9).length()*0.5;return J}intersect(J){if(this.min.max(J.min),this.max.min(J.max),this.isEmpty())this.makeEmpty();return this}union(J){return this.min.min(J.min),this.max.max(J.max),this}applyMatrix4(J){if(this.isEmpty())return this;return j9[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(J),j9[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(J),j9[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(J),j9[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(J),j9[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(J),j9[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(J),j9[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(J),j9[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(J),this.setFromPoints(j9),this}translate(J){return this.min.add(J),this.max.add(J),this}equals(J){return J.min.equals(this.min)&&J.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(J){return this.min.fromArray(J.min),this.max.fromArray(J.max),this}}var j9=[new _,new _,new _,new _,new _,new _,new _,new _],U9=new _,A6=new jJ,r8=new _,t8=new _,e8=new _,i9=new _,o9=new _,N8=new _,j7=new _,_6=new _,P6=new _,q8=new _;function b$(J,Q,$,Z,W){for(let K=0,H=J.length-3;K<=H;K+=3){q8.fromArray(J,K);let Y=W.x*Math.abs(q8.x)+W.y*Math.abs(q8.y)+W.z*Math.abs(q8.z),X=Q.dot(q8),U=$.dot(q8),N=Z.dot(q8);if(Math.max(-Math.max(X,U,N),Math.min(X,U,N))>Y)return!1}return!0}var b9=y5();function y5(){let J=new ArrayBuffer(4),Q=new Float32Array(J),$=new Uint32Array(J),Z=new Uint32Array(512),W=new Uint32Array(512);for(let X=0;X<256;++X){let U=X-127;if(U<-27)Z[X]=0,Z[X|256]=32768,W[X]=24,W[X|256]=24;else if(U<-14)Z[X]=1024>>-U-14,Z[X|256]=1024>>-U-14|32768,W[X]=-U-1,W[X|256]=-U-1;else if(U<=15)Z[X]=U+15<<10,Z[X|256]=U+15<<10|32768,W[X]=13,W[X|256]=13;else if(U<128)Z[X]=31744,Z[X|256]=64512,W[X]=24,W[X|256]=24;else Z[X]=31744,Z[X|256]=64512,W[X]=13,W[X|256]=13}let K=new Uint32Array(2048),H=new Uint32Array(64),Y=new Uint32Array(64);for(let X=1;X<1024;++X){let U=X<<13,N=0;while((U&8388608)===0)U<<=1,N-=8388608;U&=-8388609,N+=947912704,K[X]=U|N}for(let X=1024;X<2048;++X)K[X]=939524096+(X-1024<<13);for(let X=1;X<31;++X)H[X]=X<<23;H[31]=1199570944,H[32]=2147483648;for(let X=33;X<63;++X)H[X]=2147483648+(X-32<<23);H[63]=3347054592;for(let X=1;X<64;++X)if(X!==32)Y[X]=1024;return{floatView:Q,uint32View:$,baseTable:Z,shiftTable:W,mantissaTable:K,exponentTable:H,offsetTable:Y}}function uJ(J){if(Math.abs(J)>65504)q0("DataUtils.toHalfFloat(): Value out of range.");J=p0(J,-65504,65504),b9.floatView[0]=J;let Q=b9.uint32View[0],$=Q>>23&511;return b9.baseTable[$]+((Q&8388607)>>b9.shiftTable[$])}function d7(J){let Q=J>>10;return b9.uint32View[0]=b9.mantissaTable[b9.offsetTable[Q]+(J&1023)]+b9.exponentTable[Q],b9.floatView[0]}class lY{static toHalfFloat(J){return uJ(J)}static fromHalfFloat(J){return d7(J)}}var BJ=new _,T6=new s,f5=0;class HJ{constructor(J,Q,$=!1){if(Array.isArray(J))throw TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:f5++}),this.name="",this.array=J,this.itemSize=Q,this.count=J!==void 0?J.length/Q:0,this.normalized=$,this.usage=35044,this.updateRanges=[],this.gpuType=1015,this.version=0}onUploadCallback(){}set needsUpdate(J){if(J===!0)this.version++}setUsage(J){return this.usage=J,this}addUpdateRange(J,Q){this.updateRanges.push({start:J,count:Q})}clearUpdateRanges(){this.updateRanges.length=0}copy(J){return this.name=J.name,this.array=new J.array.constructor(J.array),this.itemSize=J.itemSize,this.count=J.count,this.normalized=J.normalized,this.usage=J.usage,this.gpuType=J.gpuType,this}copyAt(J,Q,$){J*=this.itemSize,$*=Q.itemSize;for(let Z=0,W=this.itemSize;Z<W;Z++)this.array[J+Z]=Q.array[$+Z];return this}copyArray(J){return this.array.set(J),this}applyMatrix3(J){if(this.itemSize===2)for(let Q=0,$=this.count;Q<$;Q++)T6.fromBufferAttribute(this,Q),T6.applyMatrix3(J),this.setXY(Q,T6.x,T6.y);else if(this.itemSize===3)for(let Q=0,$=this.count;Q<$;Q++)BJ.fromBufferAttribute(this,Q),BJ.applyMatrix3(J),this.setXYZ(Q,BJ.x,BJ.y,BJ.z);return this}applyMatrix4(J){for(let Q=0,$=this.count;Q<$;Q++)BJ.fromBufferAttribute(this,Q),BJ.applyMatrix4(J),this.setXYZ(Q,BJ.x,BJ.y,BJ.z);return this}applyNormalMatrix(J){for(let Q=0,$=this.count;Q<$;Q++)BJ.fromBufferAttribute(this,Q),BJ.applyNormalMatrix(J),this.setXYZ(Q,BJ.x,BJ.y,BJ.z);return this}transformDirection(J){for(let Q=0,$=this.count;Q<$;Q++)BJ.fromBufferAttribute(this,Q),BJ.transformDirection(J),this.setXYZ(Q,BJ.x,BJ.y,BJ.z);return this}set(J,Q=0){return this.array.set(J,Q),this}getComponent(J,Q){let $=this.array[J*this.itemSize+Q];if(this.normalized)$=mJ($,this.array);return $}setComponent(J,Q,$){if(this.normalized)$=o0($,this.array);return this.array[J*this.itemSize+Q]=$,this}getX(J){let Q=this.array[J*this.itemSize];if(this.normalized)Q=mJ(Q,this.array);return Q}setX(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize]=Q,this}getY(J){let Q=this.array[J*this.itemSize+1];if(this.normalized)Q=mJ(Q,this.array);return Q}setY(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize+1]=Q,this}getZ(J){let Q=this.array[J*this.itemSize+2];if(this.normalized)Q=mJ(Q,this.array);return Q}setZ(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize+2]=Q,this}getW(J){let Q=this.array[J*this.itemSize+3];if(this.normalized)Q=mJ(Q,this.array);return Q}setW(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize+3]=Q,this}setXY(J,Q,$){if(J*=this.itemSize,this.normalized)Q=o0(Q,this.array),$=o0($,this.array);return this.array[J+0]=Q,this.array[J+1]=$,this}setXYZ(J,Q,$,Z){if(J*=this.itemSize,this.normalized)Q=o0(Q,this.array),$=o0($,this.array),Z=o0(Z,this.array);return this.array[J+0]=Q,this.array[J+1]=$,this.array[J+2]=Z,this}setXYZW(J,Q,$,Z,W){if(J*=this.itemSize,this.normalized)Q=o0(Q,this.array),$=o0($,this.array),Z=o0(Z,this.array),W=o0(W,this.array);return this.array[J+0]=Q,this.array[J+1]=$,this.array[J+2]=Z,this.array[J+3]=W,this}onUpload(J){return this.onUploadCallback=J,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let J={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};if(this.name!=="")J.name=this.name;if(this.usage!==35044)J.usage=this.usage;return J}}class uY extends HJ{constructor(J,Q,$){super(new Int8Array(J),Q,$)}}class cY extends HJ{constructor(J,Q,$){super(new Uint8Array(J),Q,$)}}class nY extends HJ{constructor(J,Q,$){super(new Uint8ClampedArray(J),Q,$)}}class sY extends HJ{constructor(J,Q,$){super(new Int16Array(J),Q,$)}}class SQ extends HJ{constructor(J,Q,$){super(new Uint16Array(J),Q,$)}}class iY extends HJ{constructor(J,Q,$){super(new Int32Array(J),Q,$)}}class jQ extends HJ{constructor(J,Q,$){super(new Uint32Array(J),Q,$)}}class oY extends HJ{constructor(J,Q,$){super(new Uint16Array(J),Q,$);this.isFloat16BufferAttribute=!0}getX(J){let Q=d7(this.array[J*this.itemSize]);if(this.normalized)Q=mJ(Q,this.array);return Q}setX(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize]=uJ(Q),this}getY(J){let Q=d7(this.array[J*this.itemSize+1]);if(this.normalized)Q=mJ(Q,this.array);return Q}setY(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize+1]=uJ(Q),this}getZ(J){let Q=d7(this.array[J*this.itemSize+2]);if(this.normalized)Q=mJ(Q,this.array);return Q}setZ(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize+2]=uJ(Q),this}getW(J){let Q=d7(this.array[J*this.itemSize+3]);if(this.normalized)Q=mJ(Q,this.array);return Q}setW(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.array[J*this.itemSize+3]=uJ(Q),this}setXY(J,Q,$){if(J*=this.itemSize,this.normalized)Q=o0(Q,this.array),$=o0($,this.array);return this.array[J+0]=uJ(Q),this.array[J+1]=uJ($),this}setXYZ(J,Q,$,Z){if(J*=this.itemSize,this.normalized)Q=o0(Q,this.array),$=o0($,this.array),Z=o0(Z,this.array);return this.array[J+0]=uJ(Q),this.array[J+1]=uJ($),this.array[J+2]=uJ(Z),this}setXYZW(J,Q,$,Z,W){if(J*=this.itemSize,this.normalized)Q=o0(Q,this.array),$=o0($,this.array),Z=o0(Z,this.array),W=o0(W,this.array);return this.array[J+0]=uJ(Q),this.array[J+1]=uJ($),this.array[J+2]=uJ(Z),this.array[J+3]=uJ(W),this}}class B0 extends HJ{constructor(J,Q,$){super(new Float32Array(J),Q,$)}}var b5=new jJ,y7=new _,v$=new _;class TJ{constructor(J=new _,Q=-1){this.isSphere=!0,this.center=J,this.radius=Q}set(J,Q){return this.center.copy(J),this.radius=Q,this}setFromPoints(J,Q){let $=this.center;if(Q!==void 0)$.copy(Q);else b5.setFromPoints(J).getCenter($);let Z=0;for(let W=0,K=J.length;W<K;W++)Z=Math.max(Z,$.distanceToSquared(J[W]));return this.radius=Math.sqrt(Z),this}copy(J){return this.center.copy(J.center),this.radius=J.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(J){return J.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(J){return J.distanceTo(this.center)-this.radius}intersectsSphere(J){let Q=this.radius+J.radius;return J.center.distanceToSquared(this.center)<=Q*Q}intersectsBox(J){return J.intersectsSphere(this)}intersectsPlane(J){return Math.abs(J.distanceToPoint(this.center))<=this.radius}clampPoint(J,Q){let $=this.center.distanceToSquared(J);if(Q.copy(J),$>this.radius*this.radius)Q.sub(this.center).normalize(),Q.multiplyScalar(this.radius).add(this.center);return Q}getBoundingBox(J){if(this.isEmpty())return J.makeEmpty(),J;return J.set(this.center,this.center),J.expandByScalar(this.radius),J}applyMatrix4(J){return this.center.applyMatrix4(J),this.radius=this.radius*J.getMaxScaleOnAxis(),this}translate(J){return this.center.add(J),this}expandByPoint(J){if(this.isEmpty())return this.center.copy(J),this.radius=0,this;y7.subVectors(J,this.center);let Q=y7.lengthSq();if(Q>this.radius*this.radius){let $=Math.sqrt(Q),Z=($-this.radius)*0.5;this.center.addScaledVector(y7,Z/$),this.radius+=Z}return this}union(J){if(J.isEmpty())return this;if(this.isEmpty())return this.copy(J),this;if(this.center.equals(J.center)===!0)this.radius=Math.max(this.radius,J.radius);else v$.subVectors(J.center,this.center).setLength(J.radius),this.expandByPoint(y7.copy(J.center).add(v$)),this.expandByPoint(y7.copy(J.center).sub(v$));return this}equals(J){return J.center.equals(this.center)&&J.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(J){return this.radius=J.radius,this.center.fromArray(J.center),this}}var v5=0,Z9=new m0,h$=new $J,J7=new _,tJ=new jJ,f7=new jJ,_J=new _;class u0 extends F9{constructor(){super();this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:v5++}),this.uuid=eJ(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(J){if(Array.isArray(J))this.index=new((Z5(J))?jQ:SQ)(J,1);else this.index=J;return this}setIndirect(J,Q=0){return this.indirect=J,this.indirectOffset=Q,this}getIndirect(){return this.indirect}getAttribute(J){return this.attributes[J]}setAttribute(J,Q){return this.attributes[J]=Q,this}deleteAttribute(J){return delete this.attributes[J],this}hasAttribute(J){return this.attributes[J]!==void 0}addGroup(J,Q,$=0){this.groups.push({start:J,count:Q,materialIndex:$})}clearGroups(){this.groups=[]}setDrawRange(J,Q){this.drawRange.start=J,this.drawRange.count=Q}applyMatrix4(J){let Q=this.attributes.position;if(Q!==void 0)Q.applyMatrix4(J),Q.needsUpdate=!0;let $=this.attributes.normal;if($!==void 0){let W=new n0().getNormalMatrix(J);$.applyNormalMatrix(W),$.needsUpdate=!0}let Z=this.attributes.tangent;if(Z!==void 0)Z.transformDirection(J),Z.needsUpdate=!0;if(this.boundingBox!==null)this.computeBoundingBox();if(this.boundingSphere!==null)this.computeBoundingSphere();return this}applyQuaternion(J){return Z9.makeRotationFromQuaternion(J),this.applyMatrix4(Z9),this}rotateX(J){return Z9.makeRotationX(J),this.applyMatrix4(Z9),this}rotateY(J){return Z9.makeRotationY(J),this.applyMatrix4(Z9),this}rotateZ(J){return Z9.makeRotationZ(J),this.applyMatrix4(Z9),this}translate(J,Q,$){return Z9.makeTranslation(J,Q,$),this.applyMatrix4(Z9),this}scale(J,Q,$){return Z9.makeScale(J,Q,$),this.applyMatrix4(Z9),this}lookAt(J){return h$.lookAt(J),h$.updateMatrix(),this.applyMatrix4(h$.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(J7).negate(),this.translate(J7.x,J7.y,J7.z),this}setFromPoints(J){let Q=this.getAttribute("position");if(Q===void 0){let $=[];for(let Z=0,W=J.length;Z<W;Z++){let K=J[Z];$.push(K.x,K.y,K.z||0)}this.setAttribute("position",new B0($,3))}else{let $=Math.min(J.length,Q.count);for(let Z=0;Z<$;Z++){let W=J[Z];Q.setXYZ(Z,W.x,W.y,W.z||0)}if(J.length>Q.count)q0("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry.");Q.needsUpdate=!0}return this}computeBoundingBox(){if(this.boundingBox===null)this.boundingBox=new jJ;let J=this.attributes.position,Q=this.morphAttributes.position;if(J&&J.isGLBufferAttribute){j0("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new _(-1/0,-1/0,-1/0),new _(1/0,1/0,1/0));return}if(J!==void 0){if(this.boundingBox.setFromBufferAttribute(J),Q)for(let $=0,Z=Q.length;$<Z;$++){let W=Q[$];if(tJ.setFromBufferAttribute(W),this.morphTargetsRelative)_J.addVectors(this.boundingBox.min,tJ.min),this.boundingBox.expandByPoint(_J),_J.addVectors(this.boundingBox.max,tJ.max),this.boundingBox.expandByPoint(_J);else this.boundingBox.expandByPoint(tJ.min),this.boundingBox.expandByPoint(tJ.max)}}else this.boundingBox.makeEmpty();if(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))j0('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){if(this.boundingSphere===null)this.boundingSphere=new TJ;let J=this.attributes.position,Q=this.morphAttributes.position;if(J&&J.isGLBufferAttribute){j0("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new _,1/0);return}if(J){let $=this.boundingSphere.center;if(tJ.setFromBufferAttribute(J),Q)for(let W=0,K=Q.length;W<K;W++){let H=Q[W];if(f7.setFromBufferAttribute(H),this.morphTargetsRelative)_J.addVectors(tJ.min,f7.min),tJ.expandByPoint(_J),_J.addVectors(tJ.max,f7.max),tJ.expandByPoint(_J);else tJ.expandByPoint(f7.min),tJ.expandByPoint(f7.max)}tJ.getCenter($);let Z=0;for(let W=0,K=J.count;W<K;W++)_J.fromBufferAttribute(J,W),Z=Math.max(Z,$.distanceToSquared(_J));if(Q)for(let W=0,K=Q.length;W<K;W++){let H=Q[W],Y=this.morphTargetsRelative;for(let X=0,U=H.count;X<U;X++){if(_J.fromBufferAttribute(H,X),Y)J7.fromBufferAttribute(J,X),_J.add(J7);Z=Math.max(Z,$.distanceToSquared(_J))}}if(this.boundingSphere.radius=Math.sqrt(Z),isNaN(this.boundingSphere.radius))j0('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let J=this.index,Q=this.attributes;if(J===null||Q.position===void 0||Q.normal===void 0||Q.uv===void 0){j0("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let{position:$,normal:Z,uv:W}=Q;if(this.hasAttribute("tangent")===!1)this.setAttribute("tangent",new HJ(new Float32Array(4*$.count),4));let K=this.getAttribute("tangent"),H=[],Y=[];for(let w=0;w<$.count;w++)H[w]=new _,Y[w]=new _;let X=new _,U=new _,N=new _,q=new s,G=new s,E=new s,O=new _,R=new _;function D(w,k,A){X.fromBufferAttribute($,w),U.fromBufferAttribute($,k),N.fromBufferAttribute($,A),q.fromBufferAttribute(W,w),G.fromBufferAttribute(W,k),E.fromBufferAttribute(W,A),U.sub(X),N.sub(X),G.sub(q),E.sub(q);let h=1/(G.x*E.y-E.x*G.y);if(!isFinite(h))return;O.copy(U).multiplyScalar(E.y).addScaledVector(N,-G.y).multiplyScalar(h),R.copy(N).multiplyScalar(G.x).addScaledVector(U,-E.x).multiplyScalar(h),H[w].add(O),H[k].add(O),H[A].add(O),Y[w].add(R),Y[k].add(R),Y[A].add(R)}let F=this.groups;if(F.length===0)F=[{start:0,count:J.count}];for(let w=0,k=F.length;w<k;++w){let A=F[w],h=A.start,S=A.count;for(let v=h,l=h+S;v<l;v+=3)D(J.getX(v+0),J.getX(v+1),J.getX(v+2))}let M=new _,L=new _,B=new _,P=new _;function C(w){B.fromBufferAttribute(Z,w),P.copy(B);let k=H[w];M.copy(k),M.sub(B.multiplyScalar(B.dot(k))).normalize(),L.crossVectors(P,k);let h=L.dot(Y[w])<0?-1:1;K.setXYZW(w,M.x,M.y,M.z,h)}for(let w=0,k=F.length;w<k;++w){let A=F[w],h=A.start,S=A.count;for(let v=h,l=h+S;v<l;v+=3)C(J.getX(v+0)),C(J.getX(v+1)),C(J.getX(v+2))}}computeVertexNormals(){let J=this.index,Q=this.getAttribute("position");if(Q!==void 0){let $=this.getAttribute("normal");if($===void 0)$=new HJ(new Float32Array(Q.count*3),3),this.setAttribute("normal",$);else for(let q=0,G=$.count;q<G;q++)$.setXYZ(q,0,0,0);let Z=new _,W=new _,K=new _,H=new _,Y=new _,X=new _,U=new _,N=new _;if(J)for(let q=0,G=J.count;q<G;q+=3){let E=J.getX(q+0),O=J.getX(q+1),R=J.getX(q+2);Z.fromBufferAttribute(Q,E),W.fromBufferAttribute(Q,O),K.fromBufferAttribute(Q,R),U.subVectors(K,W),N.subVectors(Z,W),U.cross(N),H.fromBufferAttribute($,E),Y.fromBufferAttribute($,O),X.fromBufferAttribute($,R),H.add(U),Y.add(U),X.add(U),$.setXYZ(E,H.x,H.y,H.z),$.setXYZ(O,Y.x,Y.y,Y.z),$.setXYZ(R,X.x,X.y,X.z)}else for(let q=0,G=Q.count;q<G;q+=3)Z.fromBufferAttribute(Q,q+0),W.fromBufferAttribute(Q,q+1),K.fromBufferAttribute(Q,q+2),U.subVectors(K,W),N.subVectors(Z,W),U.cross(N),$.setXYZ(q+0,U.x,U.y,U.z),$.setXYZ(q+1,U.x,U.y,U.z),$.setXYZ(q+2,U.x,U.y,U.z);this.normalizeNormals(),$.needsUpdate=!0}}normalizeNormals(){let J=this.attributes.normal;for(let Q=0,$=J.count;Q<$;Q++)_J.fromBufferAttribute(J,Q),_J.normalize(),J.setXYZ(Q,_J.x,_J.y,_J.z)}toNonIndexed(){function J(H,Y){let{array:X,itemSize:U,normalized:N}=H,q=new X.constructor(Y.length*U),G=0,E=0;for(let O=0,R=Y.length;O<R;O++){if(H.isInterleavedBufferAttribute)G=Y[O]*H.data.stride+H.offset;else G=Y[O]*U;for(let D=0;D<U;D++)q[E++]=X[G++]}return new HJ(q,U,N)}if(this.index===null)return q0("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let Q=new u0,$=this.index.array,Z=this.attributes;for(let H in Z){let Y=Z[H],X=J(Y,$);Q.setAttribute(H,X)}let W=this.morphAttributes;for(let H in W){let Y=[],X=W[H];for(let U=0,N=X.length;U<N;U++){let q=X[U],G=J(q,$);Y.push(G)}Q.morphAttributes[H]=Y}Q.morphTargetsRelative=this.morphTargetsRelative;let K=this.groups;for(let H=0,Y=K.length;H<Y;H++){let X=K[H];Q.addGroup(X.start,X.count,X.materialIndex)}return Q}toJSON(){let J={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(J.uuid=this.uuid,J.type=this.type,this.name!=="")J.name=this.name;if(Object.keys(this.userData).length>0)J.userData=this.userData;if(this.parameters!==void 0){let Y=this.parameters;for(let X in Y)if(Y[X]!==void 0)J[X]=Y[X];return J}J.data={attributes:{}};let Q=this.index;if(Q!==null)J.data.index={type:Q.array.constructor.name,array:Array.prototype.slice.call(Q.array)};let $=this.attributes;for(let Y in $){let X=$[Y];J.data.attributes[Y]=X.toJSON(J.data)}let Z={},W=!1;for(let Y in this.morphAttributes){let X=this.morphAttributes[Y],U=[];for(let N=0,q=X.length;N<q;N++){let G=X[N];U.push(G.toJSON(J.data))}if(U.length>0)Z[Y]=U,W=!0}if(W)J.data.morphAttributes=Z,J.data.morphTargetsRelative=this.morphTargetsRelative;let K=this.groups;if(K.length>0)J.data.groups=JSON.parse(JSON.stringify(K));let H=this.boundingSphere;if(H!==null)J.data.boundingSphere=H.toJSON();return J}clone(){return new this.constructor().copy(this)}copy(J){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let Q={};this.name=J.name;let $=J.index;if($!==null)this.setIndex($.clone());let Z=J.attributes;for(let X in Z){let U=Z[X];this.setAttribute(X,U.clone(Q))}let W=J.morphAttributes;for(let X in W){let U=[],N=W[X];for(let q=0,G=N.length;q<G;q++)U.push(N[q].clone(Q));this.morphAttributes[X]=U}this.morphTargetsRelative=J.morphTargetsRelative;let K=J.groups;for(let X=0,U=K.length;X<U;X++){let N=K[X];this.addGroup(N.start,N.count,N.materialIndex)}let H=J.boundingBox;if(H!==null)this.boundingBox=H.clone();let Y=J.boundingSphere;if(Y!==null)this.boundingSphere=Y.clone();return this.drawRange.start=J.drawRange.start,this.drawRange.count=J.drawRange.count,this.userData=J.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}class U6{constructor(J,Q){this.isInterleavedBuffer=!0,this.array=J,this.stride=Q,this.count=J!==void 0?J.length/Q:0,this.usage=35044,this.updateRanges=[],this.version=0,this.uuid=eJ()}onUploadCallback(){}set needsUpdate(J){if(J===!0)this.version++}setUsage(J){return this.usage=J,this}addUpdateRange(J,Q){this.updateRanges.push({start:J,count:Q})}clearUpdateRanges(){this.updateRanges.length=0}copy(J){return this.array=new J.array.constructor(J.array),this.count=J.count,this.stride=J.stride,this.usage=J.usage,this}copyAt(J,Q,$){J*=this.stride,$*=Q.stride;for(let Z=0,W=this.stride;Z<W;Z++)this.array[J+Z]=Q.array[$+Z];return this}set(J,Q=0){return this.array.set(J,Q),this}clone(J){if(J.arrayBuffers===void 0)J.arrayBuffers={};if(this.array.buffer._uuid===void 0)this.array.buffer._uuid=eJ();if(J.arrayBuffers[this.array.buffer._uuid]===void 0)J.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer;let Q=new this.array.constructor(J.arrayBuffers[this.array.buffer._uuid]),$=new this.constructor(Q,this.stride);return $.setUsage(this.usage),$}onUpload(J){return this.onUploadCallback=J,this}toJSON(J){if(J.arrayBuffers===void 0)J.arrayBuffers={};if(this.array.buffer._uuid===void 0)this.array.buffer._uuid=eJ();if(J.arrayBuffers[this.array.buffer._uuid]===void 0)J.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer));return{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}}var pJ=new _;class A8{constructor(J,Q,$,Z=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=J,this.itemSize=Q,this.offset=$,this.normalized=Z}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(J){this.data.needsUpdate=J}applyMatrix4(J){for(let Q=0,$=this.data.count;Q<$;Q++)pJ.fromBufferAttribute(this,Q),pJ.applyMatrix4(J),this.setXYZ(Q,pJ.x,pJ.y,pJ.z);return this}applyNormalMatrix(J){for(let Q=0,$=this.count;Q<$;Q++)pJ.fromBufferAttribute(this,Q),pJ.applyNormalMatrix(J),this.setXYZ(Q,pJ.x,pJ.y,pJ.z);return this}transformDirection(J){for(let Q=0,$=this.count;Q<$;Q++)pJ.fromBufferAttribute(this,Q),pJ.transformDirection(J),this.setXYZ(Q,pJ.x,pJ.y,pJ.z);return this}getComponent(J,Q){let $=this.array[J*this.data.stride+this.offset+Q];if(this.normalized)$=mJ($,this.array);return $}setComponent(J,Q,$){if(this.normalized)$=o0($,this.array);return this.data.array[J*this.data.stride+this.offset+Q]=$,this}setX(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.data.array[J*this.data.stride+this.offset]=Q,this}setY(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.data.array[J*this.data.stride+this.offset+1]=Q,this}setZ(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.data.array[J*this.data.stride+this.offset+2]=Q,this}setW(J,Q){if(this.normalized)Q=o0(Q,this.array);return this.data.array[J*this.data.stride+this.offset+3]=Q,this}getX(J){let Q=this.data.array[J*this.data.stride+this.offset];if(this.normalized)Q=mJ(Q,this.array);return Q}getY(J){let Q=this.data.array[J*this.data.stride+this.offset+1];if(this.normalized)Q=mJ(Q,this.array);return Q}getZ(J){let Q=this.data.array[J*this.data.stride+this.offset+2];if(this.normalized)Q=mJ(Q,this.array);return Q}getW(J){let Q=this.data.array[J*this.data.stride+this.offset+3];if(this.normalized)Q=mJ(Q,this.array);return Q}setXY(J,Q,$){if(J=J*this.data.stride+this.offset,this.normalized)Q=o0(Q,this.array),$=o0($,this.array);return this.data.array[J+0]=Q,this.data.array[J+1]=$,this}setXYZ(J,Q,$,Z){if(J=J*this.data.stride+this.offset,this.normalized)Q=o0(Q,this.array),$=o0($,this.array),Z=o0(Z,this.array);return this.data.array[J+0]=Q,this.data.array[J+1]=$,this.data.array[J+2]=Z,this}setXYZW(J,Q,$,Z,W){if(J=J*this.data.stride+this.offset,this.normalized)Q=o0(Q,this.array),$=o0($,this.array),Z=o0(Z,this.array),W=o0(W,this.array);return this.data.array[J+0]=Q,this.data.array[J+1]=$,this.data.array[J+2]=Z,this.data.array[J+3]=W,this}clone(J){if(J===void 0){s7("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let Q=[];for(let $=0;$<this.count;$++){let Z=$*this.data.stride+this.offset;for(let W=0;W<this.itemSize;W++)Q.push(this.data.array[Z+W])}return new HJ(new this.array.constructor(Q),this.itemSize,this.normalized)}else{if(J.interleavedBuffers===void 0)J.interleavedBuffers={};if(J.interleavedBuffers[this.data.uuid]===void 0)J.interleavedBuffers[this.data.uuid]=this.data.clone(J);return new A8(J.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}}toJSON(J){if(J===void 0){s7("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let Q=[];for(let $=0;$<this.count;$++){let Z=$*this.data.stride+this.offset;for(let W=0;W<this.itemSize;W++)Q.push(this.data.array[Z+W])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:Q,normalized:this.normalized}}else{if(J.interleavedBuffers===void 0)J.interleavedBuffers={};if(J.interleavedBuffers[this.data.uuid]===void 0)J.interleavedBuffers[this.data.uuid]=this.data.toJSON(J);return{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}}}var h5=0;class yJ extends F9{constructor(){super();this.isMaterial=!0,Object.defineProperty(this,"id",{value:h5++}),this.uuid=eJ(),this.name="",this.type="Material",this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new M0(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=7680,this.stencilZFail=7680,this.stencilZPass=7680,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(J){if(this._alphaTest>0!==J>0)this.version++;this._alphaTest=J}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(J){if(J===void 0)return;for(let Q in J){let $=J[Q];if($===void 0){q0(`Material: parameter '${Q}' has value of undefined.`);continue}let Z=this[Q];if(Z===void 0){q0(`Material: '${Q}' is not a property of THREE.${this.type}.`);continue}if(Z&&Z.isColor)Z.set($);else if(Z&&Z.isVector3&&($&&$.isVector3))Z.copy($);else this[Q]=$}}toJSON(J){let Q=J===void 0||typeof J==="string";if(Q)J={textures:{},images:{}};let $={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};if($.uuid=this.uuid,$.type=this.type,this.name!=="")$.name=this.name;if(this.color&&this.color.isColor)$.color=this.color.getHex();if(this.roughness!==void 0)$.roughness=this.roughness;if(this.metalness!==void 0)$.metalness=this.metalness;if(this.sheen!==void 0)$.sheen=this.sheen;if(this.sheenColor&&this.sheenColor.isColor)$.sheenColor=this.sheenColor.getHex();if(this.sheenRoughness!==void 0)$.sheenRoughness=this.sheenRoughness;if(this.emissive&&this.emissive.isColor)$.emissive=this.emissive.getHex();if(this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1)$.emissiveIntensity=this.emissiveIntensity;if(this.specular&&this.specular.isColor)$.specular=this.specular.getHex();if(this.specularIntensity!==void 0)$.specularIntensity=this.specularIntensity;if(this.specularColor&&this.specularColor.isColor)$.specularColor=this.specularColor.getHex();if(this.shininess!==void 0)$.shininess=this.shininess;if(this.clearcoat!==void 0)$.clearcoat=this.clearcoat;if(this.clearcoatRoughness!==void 0)$.clearcoatRoughness=this.clearcoatRoughness;if(this.clearcoatMap&&this.clearcoatMap.isTexture)$.clearcoatMap=this.clearcoatMap.toJSON(J).uuid;if(this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture)$.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(J).uuid;if(this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture)$.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(J).uuid,$.clearcoatNormalScale=this.clearcoatNormalScale.toArray();if(this.sheenColorMap&&this.sheenColorMap.isTexture)$.sheenColorMap=this.sheenColorMap.toJSON(J).uuid;if(this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture)$.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(J).uuid;if(this.dispersion!==void 0)$.dispersion=this.dispersion;if(this.iridescence!==void 0)$.iridescence=this.iridescence;if(this.iridescenceIOR!==void 0)$.iridescenceIOR=this.iridescenceIOR;if(this.iridescenceThicknessRange!==void 0)$.iridescenceThicknessRange=this.iridescenceThicknessRange;if(this.iridescenceMap&&this.iridescenceMap.isTexture)$.iridescenceMap=this.iridescenceMap.toJSON(J).uuid;if(this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture)$.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(J).uuid;if(this.anisotropy!==void 0)$.anisotropy=this.anisotropy;if(this.anisotropyRotation!==void 0)$.anisotropyRotation=this.anisotropyRotation;if(this.anisotropyMap&&this.anisotropyMap.isTexture)$.anisotropyMap=this.anisotropyMap.toJSON(J).uuid;if(this.map&&this.map.isTexture)$.map=this.map.toJSON(J).uuid;if(this.matcap&&this.matcap.isTexture)$.matcap=this.matcap.toJSON(J).uuid;if(this.alphaMap&&this.alphaMap.isTexture)$.alphaMap=this.alphaMap.toJSON(J).uuid;if(this.lightMap&&this.lightMap.isTexture)$.lightMap=this.lightMap.toJSON(J).uuid,$.lightMapIntensity=this.lightMapIntensity;if(this.aoMap&&this.aoMap.isTexture)$.aoMap=this.aoMap.toJSON(J).uuid,$.aoMapIntensity=this.aoMapIntensity;if(this.bumpMap&&this.bumpMap.isTexture)$.bumpMap=this.bumpMap.toJSON(J).uuid,$.bumpScale=this.bumpScale;if(this.normalMap&&this.normalMap.isTexture)$.normalMap=this.normalMap.toJSON(J).uuid,$.normalMapType=this.normalMapType,$.normalScale=this.normalScale.toArray();if(this.displacementMap&&this.displacementMap.isTexture)$.displacementMap=this.displacementMap.toJSON(J).uuid,$.displacementScale=this.displacementScale,$.displacementBias=this.displacementBias;if(this.roughnessMap&&this.roughnessMap.isTexture)$.roughnessMap=this.roughnessMap.toJSON(J).uuid;if(this.metalnessMap&&this.metalnessMap.isTexture)$.metalnessMap=this.metalnessMap.toJSON(J).uuid;if(this.emissiveMap&&this.emissiveMap.isTexture)$.emissiveMap=this.emissiveMap.toJSON(J).uuid;if(this.specularMap&&this.specularMap.isTexture)$.specularMap=this.specularMap.toJSON(J).uuid;if(this.specularIntensityMap&&this.specularIntensityMap.isTexture)$.specularIntensityMap=this.specularIntensityMap.toJSON(J).uuid;if(this.specularColorMap&&this.specularColorMap.isTexture)$.specularColorMap=this.specularColorMap.toJSON(J).uuid;if(this.envMap&&this.envMap.isTexture){if($.envMap=this.envMap.toJSON(J).uuid,this.combine!==void 0)$.combine=this.combine}if(this.envMapRotation!==void 0)$.envMapRotation=this.envMapRotation.toArray();if(this.envMapIntensity!==void 0)$.envMapIntensity=this.envMapIntensity;if(this.reflectivity!==void 0)$.reflectivity=this.reflectivity;if(this.refractionRatio!==void 0)$.refractionRatio=this.refractionRatio;if(this.gradientMap&&this.gradientMap.isTexture)$.gradientMap=this.gradientMap.toJSON(J).uuid;if(this.transmission!==void 0)$.transmission=this.transmission;if(this.transmissionMap&&this.transmissionMap.isTexture)$.transmissionMap=this.transmissionMap.toJSON(J).uuid;if(this.thickness!==void 0)$.thickness=this.thickness;if(this.thicknessMap&&this.thicknessMap.isTexture)$.thicknessMap=this.thicknessMap.toJSON(J).uuid;if(this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0)$.attenuationDistance=this.attenuationDistance;if(this.attenuationColor!==void 0)$.attenuationColor=this.attenuationColor.getHex();if(this.size!==void 0)$.size=this.size;if(this.shadowSide!==null)$.shadowSide=this.shadowSide;if(this.sizeAttenuation!==void 0)$.sizeAttenuation=this.sizeAttenuation;if(this.blending!==1)$.blending=this.blending;if(this.side!==0)$.side=this.side;if(this.vertexColors===!0)$.vertexColors=!0;if(this.opacity<1)$.opacity=this.opacity;if(this.transparent===!0)$.transparent=!0;if(this.blendSrc!==204)$.blendSrc=this.blendSrc;if(this.blendDst!==205)$.blendDst=this.blendDst;if(this.blendEquation!==100)$.blendEquation=this.blendEquation;if(this.blendSrcAlpha!==null)$.blendSrcAlpha=this.blendSrcAlpha;if(this.blendDstAlpha!==null)$.blendDstAlpha=this.blendDstAlpha;if(this.blendEquationAlpha!==null)$.blendEquationAlpha=this.blendEquationAlpha;if(this.blendColor&&this.blendColor.isColor)$.blendColor=this.blendColor.getHex();if(this.blendAlpha!==0)$.blendAlpha=this.blendAlpha;if(this.depthFunc!==3)$.depthFunc=this.depthFunc;if(this.depthTest===!1)$.depthTest=this.depthTest;if(this.depthWrite===!1)$.depthWrite=this.depthWrite;if(this.colorWrite===!1)$.colorWrite=this.colorWrite;if(this.stencilWriteMask!==255)$.stencilWriteMask=this.stencilWriteMask;if(this.stencilFunc!==519)$.stencilFunc=this.stencilFunc;if(this.stencilRef!==0)$.stencilRef=this.stencilRef;if(this.stencilFuncMask!==255)$.stencilFuncMask=this.stencilFuncMask;if(this.stencilFail!==7680)$.stencilFail=this.stencilFail;if(this.stencilZFail!==7680)$.stencilZFail=this.stencilZFail;if(this.stencilZPass!==7680)$.stencilZPass=this.stencilZPass;if(this.stencilWrite===!0)$.stencilWrite=this.stencilWrite;if(this.rotation!==void 0&&this.rotation!==0)$.rotation=this.rotation;if(this.polygonOffset===!0)$.polygonOffset=!0;if(this.polygonOffsetFactor!==0)$.polygonOffsetFactor=this.polygonOffsetFactor;if(this.polygonOffsetUnits!==0)$.polygonOffsetUnits=this.polygonOffsetUnits;if(this.linewidth!==void 0&&this.linewidth!==1)$.linewidth=this.linewidth;if(this.dashSize!==void 0)$.dashSize=this.dashSize;if(this.gapSize!==void 0)$.gapSize=this.gapSize;if(this.scale!==void 0)$.scale=this.scale;if(this.dithering===!0)$.dithering=!0;if(this.alphaTest>0)$.alphaTest=this.alphaTest;if(this.alphaHash===!0)$.alphaHash=!0;if(this.alphaToCoverage===!0)$.alphaToCoverage=!0;if(this.premultipliedAlpha===!0)$.premultipliedAlpha=!0;if(this.forceSinglePass===!0)$.forceSinglePass=!0;if(this.allowOverride===!1)$.allowOverride=!1;if(this.wireframe===!0)$.wireframe=!0;if(this.wireframeLinewidth>1)$.wireframeLinewidth=this.wireframeLinewidth;if(this.wireframeLinecap!=="round")$.wireframeLinecap=this.wireframeLinecap;if(this.wireframeLinejoin!=="round")$.wireframeLinejoin=this.wireframeLinejoin;if(this.flatShading===!0)$.flatShading=!0;if(this.visible===!1)$.visible=!1;if(this.toneMapped===!1)$.toneMapped=!1;if(this.fog===!1)$.fog=!1;if(Object.keys(this.userData).length>0)$.userData=this.userData;function Z(W){let K=[];for(let H in W){let Y=W[H];delete Y.metadata,K.push(Y)}return K}if(Q){let W=Z(J.textures),K=Z(J.images);if(W.length>0)$.textures=W;if(K.length>0)$.images=K}return $}clone(){return new this.constructor().copy(this)}copy(J){this.name=J.name,this.blending=J.blending,this.side=J.side,this.vertexColors=J.vertexColors,this.opacity=J.opacity,this.transparent=J.transparent,this.blendSrc=J.blendSrc,this.blendDst=J.blendDst,this.blendEquation=J.blendEquation,this.blendSrcAlpha=J.blendSrcAlpha,this.blendDstAlpha=J.blendDstAlpha,this.blendEquationAlpha=J.blendEquationAlpha,this.blendColor.copy(J.blendColor),this.blendAlpha=J.blendAlpha,this.depthFunc=J.depthFunc,this.depthTest=J.depthTest,this.depthWrite=J.depthWrite,this.stencilWriteMask=J.stencilWriteMask,this.stencilFunc=J.stencilFunc,this.stencilRef=J.stencilRef,this.stencilFuncMask=J.stencilFuncMask,this.stencilFail=J.stencilFail,this.stencilZFail=J.stencilZFail,this.stencilZPass=J.stencilZPass,this.stencilWrite=J.stencilWrite;let Q=J.clippingPlanes,$=null;if(Q!==null){let Z=Q.length;$=Array(Z);for(let W=0;W!==Z;++W)$[W]=Q[W].clone()}return this.clippingPlanes=$,this.clipIntersection=J.clipIntersection,this.clipShadows=J.clipShadows,this.shadowSide=J.shadowSide,this.colorWrite=J.colorWrite,this.precision=J.precision,this.polygonOffset=J.polygonOffset,this.polygonOffsetFactor=J.polygonOffsetFactor,this.polygonOffsetUnits=J.polygonOffsetUnits,this.dithering=J.dithering,this.alphaTest=J.alphaTest,this.alphaHash=J.alphaHash,this.alphaToCoverage=J.alphaToCoverage,this.premultipliedAlpha=J.premultipliedAlpha,this.forceSinglePass=J.forceSinglePass,this.allowOverride=J.allowOverride,this.visible=J.visible,this.toneMapped=J.toneMapped,this.userData=JSON.parse(JSON.stringify(J.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(J){if(J===!0)this.version++}}class yQ extends yJ{constructor(J){super();this.isSpriteMaterial=!0,this.type="SpriteMaterial",this.color=new M0(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.alphaMap=J.alphaMap,this.rotation=J.rotation,this.sizeAttenuation=J.sizeAttenuation,this.fog=J.fog,this}}var Q7,b7=new _,$7=new _,Z7=new _,W7=new s,v7=new s,aY=new m0,S6=new _,h7=new _,j6=new _,dK=new s,x$=new s,lK=new s;class EW extends $J{constructor(J=new yQ){super();if(this.isSprite=!0,this.type="Sprite",Q7===void 0){Q7=new u0;let Q=new Float32Array([-0.5,-0.5,0,0,0,0.5,-0.5,0,1,0,0.5,0.5,0,1,1,-0.5,0.5,0,0,1]),$=new U6(Q,5);Q7.setIndex([0,1,2,0,2,3]),Q7.setAttribute("position",new A8($,3,0,!1)),Q7.setAttribute("uv",new A8($,2,3,!1))}this.geometry=Q7,this.material=J,this.center=new s(0.5,0.5),this.count=1}raycast(J,Q){if(J.camera===null)j0('Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.');if($7.setFromMatrixScale(this.matrixWorld),aY.copy(J.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(J.camera.matrixWorldInverse,this.matrixWorld),Z7.setFromMatrixPosition(this.modelViewMatrix),J.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1)$7.multiplyScalar(-Z7.z);let $=this.material.rotation,Z,W;if($!==0)W=Math.cos($),Z=Math.sin($);let K=this.center;y6(S6.set(-0.5,-0.5,0),Z7,K,$7,Z,W),y6(h7.set(0.5,-0.5,0),Z7,K,$7,Z,W),y6(j6.set(0.5,0.5,0),Z7,K,$7,Z,W),dK.set(0,0),x$.set(1,0),lK.set(1,1);let H=J.ray.intersectTriangle(S6,h7,j6,!1,b7);if(H===null){if(y6(h7.set(-0.5,0.5,0),Z7,K,$7,Z,W),x$.set(0,1),H=J.ray.intersectTriangle(S6,j6,h7,!1,b7),H===null)return}let Y=J.ray.origin.distanceTo(b7);if(Y<J.near||Y>J.far)return;Q.push({distance:Y,point:b7.clone(),uv:cJ.getInterpolation(b7,S6,h7,j6,dK,x$,lK,new s),face:null,object:this})}copy(J,Q){if(super.copy(J,Q),J.center!==void 0)this.center.copy(J.center);return this.material=J.material,this}}function y6(J,Q,$,Z,W,K){if(W7.subVectors(J,$).addScalar(0.5).multiply(Z),W!==void 0)v7.x=K*W7.x-W*W7.y,v7.y=W*W7.x+K*W7.y;else v7.copy(W7);J.copy(Q),J.x+=v7.x,J.y+=v7.y,J.applyMatrix4(aY)}var f6=new _,uK=new _;class FW extends $J{constructor(){super();this.isLOD=!0,this._currentLevel=0,this.type="LOD",Object.defineProperties(this,{levels:{enumerable:!0,value:[]}}),this.autoUpdate=!0}copy(J){super.copy(J,!1);let Q=J.levels;for(let $=0,Z=Q.length;$<Z;$++){let W=Q[$];this.addLevel(W.object.clone(),W.distance,W.hysteresis)}return this.autoUpdate=J.autoUpdate,this}addLevel(J,Q=0,$=0){Q=Math.abs(Q);let Z=this.levels,W;for(W=0;W<Z.length;W++)if(Q<Z[W].distance)break;return Z.splice(W,0,{distance:Q,hysteresis:$,object:J}),this.add(J),this}removeLevel(J){let Q=this.levels;for(let $=0;$<Q.length;$++)if(Q[$].distance===J){let Z=Q.splice($,1);return this.remove(Z[0].object),!0}return!1}getCurrentLevel(){return this._currentLevel}getObjectForDistance(J){let Q=this.levels;if(Q.length>0){let $,Z;for($=1,Z=Q.length;$<Z;$++){let W=Q[$].distance;if(Q[$].object.visible)W-=W*Q[$].hysteresis;if(J<W)break}return Q[$-1].object}return null}raycast(J,Q){if(this.levels.length>0){f6.setFromMatrixPosition(this.matrixWorld);let Z=J.ray.origin.distanceTo(f6);this.getObjectForDistance(Z).raycast(J,Q)}}update(J){let Q=this.levels;if(Q.length>1){f6.setFromMatrixPosition(J.matrixWorld),uK.setFromMatrixPosition(this.matrixWorld);let $=f6.distanceTo(uK)/J.zoom;Q[0].object.visible=!0;let Z,W;for(Z=1,W=Q.length;Z<W;Z++){let K=Q[Z].distance;if(Q[Z].object.visible)K-=K*Q[Z].hysteresis;if($>=K)Q[Z-1].object.visible=!1,Q[Z].object.visible=!0;else break}this._currentLevel=Z-1;for(;Z<W;Z++)Q[Z].object.visible=!1}}toJSON(J){let Q=super.toJSON(J);if(this.autoUpdate===!1)Q.object.autoUpdate=!1;Q.object.levels=[];let $=this.levels;for(let Z=0,W=$.length;Z<W;Z++){let K=$[Z];Q.object.levels.push({object:K.object.uuid,distance:K.distance,hysteresis:K.hysteresis})}return Q}}var y9=new _,g$=new _,b6=new _,a9=new _,p$=new _,v6=new _,m$=new _;class m9{constructor(J=new _,Q=new _(0,0,-1)){this.origin=J,this.direction=Q}set(J,Q){return this.origin.copy(J),this.direction.copy(Q),this}copy(J){return this.origin.copy(J.origin),this.direction.copy(J.direction),this}at(J,Q){return Q.copy(this.origin).addScaledVector(this.direction,J)}lookAt(J){return this.direction.copy(J).sub(this.origin).normalize(),this}recast(J){return this.origin.copy(this.at(J,y9)),this}closestPointToPoint(J,Q){Q.subVectors(J,this.origin);let $=Q.dot(this.direction);if($<0)return Q.copy(this.origin);return Q.copy(this.origin).addScaledVector(this.direction,$)}distanceToPoint(J){return Math.sqrt(this.distanceSqToPoint(J))}distanceSqToPoint(J){let Q=y9.subVectors(J,this.origin).dot(this.direction);if(Q<0)return this.origin.distanceToSquared(J);return y9.copy(this.origin).addScaledVector(this.direction,Q),y9.distanceToSquared(J)}distanceSqToSegment(J,Q,$,Z){g$.copy(J).add(Q).multiplyScalar(0.5),b6.copy(Q).sub(J).normalize(),a9.copy(this.origin).sub(g$);let W=J.distanceTo(Q)*0.5,K=-this.direction.dot(b6),H=a9.dot(this.direction),Y=-a9.dot(b6),X=a9.lengthSq(),U=Math.abs(1-K*K),N,q,G,E;if(U>0)if(N=K*Y-H,q=K*H-Y,E=W*U,N>=0)if(q>=-E)if(q<=E){let O=1/U;N*=O,q*=O,G=N*(N+K*q+2*H)+q*(K*N+q+2*Y)+X}else q=W,N=Math.max(0,-(K*q+H)),G=-N*N+q*(q+2*Y)+X;else q=-W,N=Math.max(0,-(K*q+H)),G=-N*N+q*(q+2*Y)+X;else if(q<=-E)N=Math.max(0,-(-K*W+H)),q=N>0?-W:Math.min(Math.max(-W,-Y),W),G=-N*N+q*(q+2*Y)+X;else if(q<=E)N=0,q=Math.min(Math.max(-W,-Y),W),G=q*(q+2*Y)+X;else N=Math.max(0,-(K*W+H)),q=N>0?W:Math.min(Math.max(-W,-Y),W),G=-N*N+q*(q+2*Y)+X;else q=K>0?-W:W,N=Math.max(0,-(K*q+H)),G=-N*N+q*(q+2*Y)+X;if($)$.copy(this.origin).addScaledVector(this.direction,N);if(Z)Z.copy(g$).addScaledVector(b6,q);return G}intersectSphere(J,Q){y9.subVectors(J.center,this.origin);let $=y9.dot(this.direction),Z=y9.dot(y9)-$*$,W=J.radius*J.radius;if(Z>W)return null;let K=Math.sqrt(W-Z),H=$-K,Y=$+K;if(Y<0)return null;if(H<0)return this.at(Y,Q);return this.at(H,Q)}intersectsSphere(J){if(J.radius<0)return!1;return this.distanceSqToPoint(J.center)<=J.radius*J.radius}distanceToPlane(J){let Q=J.normal.dot(this.direction);if(Q===0){if(J.distanceToPoint(this.origin)===0)return 0;return null}let $=-(this.origin.dot(J.normal)+J.constant)/Q;return $>=0?$:null}intersectPlane(J,Q){let $=this.distanceToPlane(J);if($===null)return null;return this.at($,Q)}intersectsPlane(J){let Q=J.distanceToPoint(this.origin);if(Q===0)return!0;if(J.normal.dot(this.direction)*Q<0)return!0;return!1}intersectBox(J,Q){let $,Z,W,K,H,Y,X=1/this.direction.x,U=1/this.direction.y,N=1/this.direction.z,q=this.origin;if(X>=0)$=(J.min.x-q.x)*X,Z=(J.max.x-q.x)*X;else $=(J.max.x-q.x)*X,Z=(J.min.x-q.x)*X;if(U>=0)W=(J.min.y-q.y)*U,K=(J.max.y-q.y)*U;else W=(J.max.y-q.y)*U,K=(J.min.y-q.y)*U;if($>K||W>Z)return null;if(W>$||isNaN($))$=W;if(K<Z||isNaN(Z))Z=K;if(N>=0)H=(J.min.z-q.z)*N,Y=(J.max.z-q.z)*N;else H=(J.max.z-q.z)*N,Y=(J.min.z-q.z)*N;if($>Y||H>Z)return null;if(H>$||$!==$)$=H;if(Y<Z||Z!==Z)Z=Y;if(Z<0)return null;return this.at($>=0?$:Z,Q)}intersectsBox(J){return this.intersectBox(J,y9)!==null}intersectTriangle(J,Q,$,Z,W){p$.subVectors(Q,J),v6.subVectors($,J),m$.crossVectors(p$,v6);let K=this.direction.dot(m$),H;if(K>0){if(Z)return null;H=1}else if(K<0)H=-1,K=-K;else return null;a9.subVectors(this.origin,J);let Y=H*this.direction.dot(v6.crossVectors(a9,v6));if(Y<0)return null;let X=H*this.direction.dot(p$.cross(a9));if(X<0)return null;if(Y+X>K)return null;let U=-H*a9.dot(m$);if(U<0)return null;return this.at(U/K,W)}applyMatrix4(J){return this.origin.applyMatrix4(J),this.direction.transformDirection(J),this}equals(J){return J.origin.equals(this.origin)&&J.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class d9 extends yJ{constructor(J){super();this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new M0(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new J9,this.combine=0,this.reflectivity=1,this.refractionRatio=0.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.lightMap=J.lightMap,this.lightMapIntensity=J.lightMapIntensity,this.aoMap=J.aoMap,this.aoMapIntensity=J.aoMapIntensity,this.specularMap=J.specularMap,this.alphaMap=J.alphaMap,this.envMap=J.envMap,this.envMapRotation.copy(J.envMapRotation),this.combine=J.combine,this.reflectivity=J.reflectivity,this.refractionRatio=J.refractionRatio,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.wireframeLinecap=J.wireframeLinecap,this.wireframeLinejoin=J.wireframeLinejoin,this.fog=J.fog,this}}var cK=new m0,E8=new m9,h6=new TJ,nK=new _,x6=new _,g6=new _,p6=new _,d$=new _,m6=new _,sK=new _,d6=new _;class VJ extends $J{constructor(J=new u0,Q=new d9){super();this.isMesh=!0,this.type="Mesh",this.geometry=J,this.material=Q,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(J,Q){if(super.copy(J,Q),J.morphTargetInfluences!==void 0)this.morphTargetInfluences=J.morphTargetInfluences.slice();if(J.morphTargetDictionary!==void 0)this.morphTargetDictionary=Object.assign({},J.morphTargetDictionary);return this.material=Array.isArray(J.material)?J.material.slice():J.material,this.geometry=J.geometry,this}updateMorphTargets(){let Q=this.geometry.morphAttributes,$=Object.keys(Q);if($.length>0){let Z=Q[$[0]];if(Z!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let W=0,K=Z.length;W<K;W++){let H=Z[W].name||String(W);this.morphTargetInfluences.push(0),this.morphTargetDictionary[H]=W}}}}getVertexPosition(J,Q){let $=this.geometry,Z=$.attributes.position,W=$.morphAttributes.position,K=$.morphTargetsRelative;Q.fromBufferAttribute(Z,J);let H=this.morphTargetInfluences;if(W&&H){m6.set(0,0,0);for(let Y=0,X=W.length;Y<X;Y++){let U=H[Y],N=W[Y];if(U===0)continue;if(d$.fromBufferAttribute(N,J),K)m6.addScaledVector(d$,U);else m6.addScaledVector(d$.sub(Q),U)}Q.add(m6)}return Q}raycast(J,Q){let $=this.geometry,Z=this.material,W=this.matrixWorld;if(Z===void 0)return;if($.boundingSphere===null)$.computeBoundingSphere();if(h6.copy($.boundingSphere),h6.applyMatrix4(W),E8.copy(J.ray).recast(J.near),h6.containsPoint(E8.origin)===!1){if(E8.intersectSphere(h6,nK)===null)return;if(E8.origin.distanceToSquared(nK)>(J.far-J.near)**2)return}if(cK.copy(W).invert(),E8.copy(J.ray).applyMatrix4(cK),$.boundingBox!==null){if(E8.intersectsBox($.boundingBox)===!1)return}this._computeIntersections(J,Q,E8)}_computeIntersections(J,Q,$){let Z,W=this.geometry,K=this.material,H=W.index,Y=W.attributes.position,X=W.attributes.uv,U=W.attributes.uv1,N=W.attributes.normal,q=W.groups,G=W.drawRange;if(H!==null)if(Array.isArray(K))for(let E=0,O=q.length;E<O;E++){let R=q[E],D=K[R.materialIndex],F=Math.max(R.start,G.start),M=Math.min(H.count,Math.min(R.start+R.count,G.start+G.count));for(let L=F,B=M;L<B;L+=3){let P=H.getX(L),C=H.getX(L+1),w=H.getX(L+2);if(Z=l6(this,D,J,$,X,U,N,P,C,w),Z)Z.faceIndex=Math.floor(L/3),Z.face.materialIndex=R.materialIndex,Q.push(Z)}}else{let E=Math.max(0,G.start),O=Math.min(H.count,G.start+G.count);for(let R=E,D=O;R<D;R+=3){let F=H.getX(R),M=H.getX(R+1),L=H.getX(R+2);if(Z=l6(this,K,J,$,X,U,N,F,M,L),Z)Z.faceIndex=Math.floor(R/3),Q.push(Z)}}else if(Y!==void 0)if(Array.isArray(K))for(let E=0,O=q.length;E<O;E++){let R=q[E],D=K[R.materialIndex],F=Math.max(R.start,G.start),M=Math.min(Y.count,Math.min(R.start+R.count,G.start+G.count));for(let L=F,B=M;L<B;L+=3){let P=L,C=L+1,w=L+2;if(Z=l6(this,D,J,$,X,U,N,P,C,w),Z)Z.faceIndex=Math.floor(L/3),Z.face.materialIndex=R.materialIndex,Q.push(Z)}}else{let E=Math.max(0,G.start),O=Math.min(Y.count,G.start+G.count);for(let R=E,D=O;R<D;R+=3){let F=R,M=R+1,L=R+2;if(Z=l6(this,K,J,$,X,U,N,F,M,L),Z)Z.faceIndex=Math.floor(R/3),Q.push(Z)}}}}function x5(J,Q,$,Z,W,K,H,Y){let X;if(Q.side===1)X=Z.intersectTriangle(H,K,W,!0,Y);else X=Z.intersectTriangle(W,K,H,Q.side===0,Y);if(X===null)return null;d6.copy(Y),d6.applyMatrix4(J.matrixWorld);let U=$.ray.origin.distanceTo(d6);if(U<$.near||U>$.far)return null;return{distance:U,point:d6.clone(),object:J}}function l6(J,Q,$,Z,W,K,H,Y,X,U){J.getVertexPosition(Y,x6),J.getVertexPosition(X,g6),J.getVertexPosition(U,p6);let N=x5(J,Q,$,Z,x6,g6,p6,sK);if(N){let q=new _;if(cJ.getBarycoord(sK,x6,g6,p6,q),W)N.uv=cJ.getInterpolatedAttribute(W,Y,X,U,q,new s);if(K)N.uv1=cJ.getInterpolatedAttribute(K,Y,X,U,q,new s);if(H){if(N.normal=cJ.getInterpolatedAttribute(H,Y,X,U,q,new _),N.normal.dot(Z.direction)>0)N.normal.multiplyScalar(-1)}let G={a:Y,b:X,c:U,normal:new _,materialIndex:0};cJ.getNormal(x6,g6,p6,G.normal),N.face=G,N.barycoord=q}return N}var iK=new _,oK=new qJ,aK=new qJ,g5=new _,rK=new m0,u6=new _,l$=new TJ,tK=new m0,u$=new m9;class DW extends VJ{constructor(J,Q){super(J,Q);this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode="attached",this.bindMatrix=new m0,this.bindMatrixInverse=new m0,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){let J=this.geometry;if(this.boundingBox===null)this.boundingBox=new jJ;this.boundingBox.makeEmpty();let Q=J.getAttribute("position");for(let $=0;$<Q.count;$++)this.getVertexPosition($,u6),this.boundingBox.expandByPoint(u6)}computeBoundingSphere(){let J=this.geometry;if(this.boundingSphere===null)this.boundingSphere=new TJ;this.boundingSphere.makeEmpty();let Q=J.getAttribute("position");for(let $=0;$<Q.count;$++)this.getVertexPosition($,u6),this.boundingSphere.expandByPoint(u6)}copy(J,Q){if(super.copy(J,Q),this.bindMode=J.bindMode,this.bindMatrix.copy(J.bindMatrix),this.bindMatrixInverse.copy(J.bindMatrixInverse),this.skeleton=J.skeleton,J.boundingBox!==null)this.boundingBox=J.boundingBox.clone();if(J.boundingSphere!==null)this.boundingSphere=J.boundingSphere.clone();return this}raycast(J,Q){let $=this.material,Z=this.matrixWorld;if($===void 0)return;if(this.boundingSphere===null)this.computeBoundingSphere();if(l$.copy(this.boundingSphere),l$.applyMatrix4(Z),J.ray.intersectsSphere(l$)===!1)return;if(tK.copy(Z).invert(),u$.copy(J.ray).applyMatrix4(tK),this.boundingBox!==null){if(u$.intersectsBox(this.boundingBox)===!1)return}this._computeIntersections(J,Q,u$)}getVertexPosition(J,Q){return super.getVertexPosition(J,Q),this.applyBoneTransform(J,Q),Q}bind(J,Q){if(this.skeleton=J,Q===void 0)this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),Q=this.matrixWorld;this.bindMatrix.copy(Q),this.bindMatrixInverse.copy(Q).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){let J=new qJ,Q=this.geometry.attributes.skinWeight;for(let $=0,Z=Q.count;$<Z;$++){J.fromBufferAttribute(Q,$);let W=1/J.manhattanLength();if(W!==1/0)J.multiplyScalar(W);else J.set(1,0,0,0);Q.setXYZW($,J.x,J.y,J.z,J.w)}}updateMatrixWorld(J){if(super.updateMatrixWorld(J),this.bindMode==="attached")this.bindMatrixInverse.copy(this.matrixWorld).invert();else if(this.bindMode==="detached")this.bindMatrixInverse.copy(this.bindMatrix).invert();else q0("SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(J,Q){let $=this.skeleton,Z=this.geometry;oK.fromBufferAttribute(Z.attributes.skinIndex,J),aK.fromBufferAttribute(Z.attributes.skinWeight,J),iK.copy(Q).applyMatrix4(this.bindMatrix),Q.set(0,0,0);for(let W=0;W<4;W++){let K=aK.getComponent(W);if(K!==0){let H=oK.getComponent(W);rK.multiplyMatrices($.bones[H].matrixWorld,$.boneInverses[H]),Q.addScaledVector(g5.copy(iK).applyMatrix4(rK),K)}}return Q.applyMatrix4(this.bindMatrixInverse)}}class fQ extends $J{constructor(){super();this.isBone=!0,this.type="Bone"}}class W9 extends kJ{constructor(J=null,Q=1,$=1,Z,W,K,H,Y,X=1003,U=1003,N,q){super(null,K,H,Y,X,U,Z,W,N,q);this.isDataTexture=!0,this.image={data:J,width:Q,height:$},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}var eK=new m0,p5=new m0;class bQ{constructor(J=[],Q=[]){this.uuid=eJ(),this.bones=J.slice(0),this.boneInverses=Q,this.boneMatrices=null,this.previousBoneMatrices=null,this.boneTexture=null,this.init()}init(){let J=this.bones,Q=this.boneInverses;if(this.boneMatrices=new Float32Array(J.length*16),Q.length===0)this.calculateInverses();else if(J.length!==Q.length){q0("Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let $=0,Z=this.bones.length;$<Z;$++)this.boneInverses.push(new m0)}}calculateInverses(){this.boneInverses.length=0;for(let J=0,Q=this.bones.length;J<Q;J++){let $=new m0;if(this.bones[J])$.copy(this.bones[J].matrixWorld).invert();this.boneInverses.push($)}}pose(){for(let J=0,Q=this.bones.length;J<Q;J++){let $=this.bones[J];if($)$.matrixWorld.copy(this.boneInverses[J]).invert()}for(let J=0,Q=this.bones.length;J<Q;J++){let $=this.bones[J];if($){if($.parent&&$.parent.isBone)$.matrix.copy($.parent.matrixWorld).invert(),$.matrix.multiply($.matrixWorld);else $.matrix.copy($.matrixWorld);$.matrix.decompose($.position,$.quaternion,$.scale)}}}update(){let J=this.bones,Q=this.boneInverses,$=this.boneMatrices,Z=this.boneTexture;for(let W=0,K=J.length;W<K;W++){let H=J[W]?J[W].matrixWorld:p5;eK.multiplyMatrices(H,Q[W]),eK.toArray($,W*16)}if(Z!==null)Z.needsUpdate=!0}clone(){return new bQ(this.bones,this.boneInverses)}computeBoneTexture(){let J=Math.sqrt(this.bones.length*4);J=Math.ceil(J/4)*4,J=Math.max(J,4);let Q=new Float32Array(J*J*4);Q.set(this.boneMatrices);let $=new W9(Q,J,J,1023,1015);return $.needsUpdate=!0,this.boneMatrices=Q,this.boneTexture=$,this}getBoneByName(J){for(let Q=0,$=this.bones.length;Q<$;Q++){let Z=this.bones[Q];if(Z.name===J)return Z}return}dispose(){if(this.boneTexture!==null)this.boneTexture.dispose(),this.boneTexture=null}fromJSON(J,Q){this.uuid=J.uuid;for(let $=0,Z=J.bones.length;$<Z;$++){let W=J.bones[$],K=Q[W];if(K===void 0)q0("Skeleton: No bone found with UUID:",W),K=new fQ;this.bones.push(K),this.boneInverses.push(new m0().fromArray(J.boneInverses[$]))}return this.init(),this}toJSON(){let J={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};J.uuid=this.uuid;let Q=this.bones,$=this.boneInverses;for(let Z=0,W=Q.length;Z<W;Z++){let K=Q[Z];J.bones.push(K.uuid);let H=$[Z];J.boneInverses.push(H.toArray())}return J}}class _8 extends HJ{constructor(J,Q,$,Z=1){super(J,Q,$);this.isInstancedBufferAttribute=!0,this.meshPerAttribute=Z}copy(J){return super.copy(J),this.meshPerAttribute=J.meshPerAttribute,this}toJSON(){let J=super.toJSON();return J.meshPerAttribute=this.meshPerAttribute,J.isInstancedBufferAttribute=!0,J}}var K7=new m0,JH=new m0,c6=[],QH=new jJ,m5=new m0,x7=new VJ,g7=new TJ;class OW extends VJ{constructor(J,Q,$){super(J,Q);this.isInstancedMesh=!0,this.instanceMatrix=new _8(new Float32Array($*16),16),this.previousInstanceMatrix=null,this.instanceColor=null,this.morphTexture=null,this.count=$,this.boundingBox=null,this.boundingSphere=null;for(let Z=0;Z<$;Z++)this.setMatrixAt(Z,m5)}computeBoundingBox(){let J=this.geometry,Q=this.count;if(this.boundingBox===null)this.boundingBox=new jJ;if(J.boundingBox===null)J.computeBoundingBox();this.boundingBox.makeEmpty();for(let $=0;$<Q;$++)this.getMatrixAt($,K7),QH.copy(J.boundingBox).applyMatrix4(K7),this.boundingBox.union(QH)}computeBoundingSphere(){let J=this.geometry,Q=this.count;if(this.boundingSphere===null)this.boundingSphere=new TJ;if(J.boundingSphere===null)J.computeBoundingSphere();this.boundingSphere.makeEmpty();for(let $=0;$<Q;$++)this.getMatrixAt($,K7),g7.copy(J.boundingSphere).applyMatrix4(K7),this.boundingSphere.union(g7)}copy(J,Q){if(super.copy(J,Q),this.instanceMatrix.copy(J.instanceMatrix),J.previousInstanceMatrix!==null)this.previousInstanceMatrix=J.previousInstanceMatrix.clone();if(J.morphTexture!==null)this.morphTexture=J.morphTexture.clone();if(J.instanceColor!==null)this.instanceColor=J.instanceColor.clone();if(this.count=J.count,J.boundingBox!==null)this.boundingBox=J.boundingBox.clone();if(J.boundingSphere!==null)this.boundingSphere=J.boundingSphere.clone();return this}getColorAt(J,Q){Q.fromArray(this.instanceColor.array,J*3)}getMatrixAt(J,Q){Q.fromArray(this.instanceMatrix.array,J*16)}getMorphAt(J,Q){let $=Q.morphTargetInfluences,Z=this.morphTexture.source.data.data,W=$.length+1,K=J*W+1;for(let H=0;H<$.length;H++)$[H]=Z[K+H]}raycast(J,Q){let $=this.matrixWorld,Z=this.count;if(x7.geometry=this.geometry,x7.material=this.material,x7.material===void 0)return;if(this.boundingSphere===null)this.computeBoundingSphere();if(g7.copy(this.boundingSphere),g7.applyMatrix4($),J.ray.intersectsSphere(g7)===!1)return;for(let W=0;W<Z;W++){this.getMatrixAt(W,K7),JH.multiplyMatrices($,K7),x7.matrixWorld=JH,x7.raycast(J,c6);for(let K=0,H=c6.length;K<H;K++){let Y=c6[K];Y.instanceId=W,Y.object=this,Q.push(Y)}c6.length=0}}setColorAt(J,Q){if(this.instanceColor===null)this.instanceColor=new _8(new Float32Array(this.instanceMatrix.count*3).fill(1),3);Q.toArray(this.instanceColor.array,J*3)}setMatrixAt(J,Q){Q.toArray(this.instanceMatrix.array,J*16)}setMorphAt(J,Q){let $=Q.morphTargetInfluences,Z=$.length+1;if(this.morphTexture===null)this.morphTexture=new W9(new Float32Array(Z*this.count),Z,this.count,1028,1015);let W=this.morphTexture.source.data.data,K=0;for(let X=0;X<$.length;X++)K+=$[X];let H=this.geometry.morphTargetsRelative?1:1-K,Y=Z*J;W[Y]=H,W.set($,Y+1)}updateMorphTargets(){}dispose(){if(this.dispatchEvent({type:"dispose"}),this.morphTexture!==null)this.morphTexture.dispose(),this.morphTexture=null}}var c$=new _,d5=new _,l5=new n0;class G9{constructor(J=new _(1,0,0),Q=0){this.isPlane=!0,this.normal=J,this.constant=Q}set(J,Q){return this.normal.copy(J),this.constant=Q,this}setComponents(J,Q,$,Z){return this.normal.set(J,Q,$),this.constant=Z,this}setFromNormalAndCoplanarPoint(J,Q){return this.normal.copy(J),this.constant=-Q.dot(this.normal),this}setFromCoplanarPoints(J,Q,$){let Z=c$.subVectors($,Q).cross(d5.subVectors(J,Q)).normalize();return this.setFromNormalAndCoplanarPoint(Z,J),this}copy(J){return this.normal.copy(J.normal),this.constant=J.constant,this}normalize(){let J=1/this.normal.length();return this.normal.multiplyScalar(J),this.constant*=J,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(J){return this.normal.dot(J)+this.constant}distanceToSphere(J){return this.distanceToPoint(J.center)-J.radius}projectPoint(J,Q){return Q.copy(J).addScaledVector(this.normal,-this.distanceToPoint(J))}intersectLine(J,Q){let $=J.delta(c$),Z=this.normal.dot($);if(Z===0){if(this.distanceToPoint(J.start)===0)return Q.copy(J.start);return null}let W=-(J.start.dot(this.normal)+this.constant)/Z;if(W<0||W>1)return null;return Q.copy(J.start).addScaledVector($,W)}intersectsLine(J){let Q=this.distanceToPoint(J.start),$=this.distanceToPoint(J.end);return Q<0&&$>0||$<0&&Q>0}intersectsBox(J){return J.intersectsPlane(this)}intersectsSphere(J){return J.intersectsPlane(this)}coplanarPoint(J){return J.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(J,Q){let $=Q||l5.getNormalMatrix(J),Z=this.coplanarPoint(c$).applyMatrix4(J),W=this.normal.applyMatrix3($).normalize();return this.constant=-Z.dot(W),this}translate(J){return this.constant-=J.dot(this.normal),this}equals(J){return J.normal.equals(this.normal)&&J.constant===this.constant}clone(){return new this.constructor().copy(this)}}var F8=new TJ,u5=new s(0.5,0.5),n6=new _;class b8{constructor(J=new G9,Q=new G9,$=new G9,Z=new G9,W=new G9,K=new G9){this.planes=[J,Q,$,Z,W,K]}set(J,Q,$,Z,W,K){let H=this.planes;return H[0].copy(J),H[1].copy(Q),H[2].copy($),H[3].copy(Z),H[4].copy(W),H[5].copy(K),this}copy(J){let Q=this.planes;for(let $=0;$<6;$++)Q[$].copy(J.planes[$]);return this}setFromProjectionMatrix(J,Q=2000,$=!1){let Z=this.planes,W=J.elements,K=W[0],H=W[1],Y=W[2],X=W[3],U=W[4],N=W[5],q=W[6],G=W[7],E=W[8],O=W[9],R=W[10],D=W[11],F=W[12],M=W[13],L=W[14],B=W[15];if(Z[0].setComponents(X-K,G-U,D-E,B-F).normalize(),Z[1].setComponents(X+K,G+U,D+E,B+F).normalize(),Z[2].setComponents(X+H,G+N,D+O,B+M).normalize(),Z[3].setComponents(X-H,G-N,D-O,B-M).normalize(),$)Z[4].setComponents(Y,q,R,L).normalize(),Z[5].setComponents(X-Y,G-q,D-R,B-L).normalize();else if(Z[4].setComponents(X-Y,G-q,D-R,B-L).normalize(),Q===2000)Z[5].setComponents(X+Y,G+q,D+R,B+L).normalize();else if(Q===2001)Z[5].setComponents(Y,q,R,L).normalize();else throw Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+Q);return this}intersectsObject(J){if(J.boundingSphere!==void 0){if(J.boundingSphere===null)J.computeBoundingSphere();F8.copy(J.boundingSphere).applyMatrix4(J.matrixWorld)}else{let Q=J.geometry;if(Q.boundingSphere===null)Q.computeBoundingSphere();F8.copy(Q.boundingSphere).applyMatrix4(J.matrixWorld)}return this.intersectsSphere(F8)}intersectsSprite(J){F8.center.set(0,0,0);let Q=u5.distanceTo(J.center);return F8.radius=0.7071067811865476+Q,F8.applyMatrix4(J.matrixWorld),this.intersectsSphere(F8)}intersectsSphere(J){let Q=this.planes,$=J.center,Z=-J.radius;for(let W=0;W<6;W++)if(Q[W].distanceToPoint($)<Z)return!1;return!0}intersectsBox(J){let Q=this.planes;for(let $=0;$<6;$++){let Z=Q[$];if(n6.x=Z.normal.x>0?J.max.x:J.min.x,n6.y=Z.normal.y>0?J.max.y:J.min.y,n6.z=Z.normal.z>0?J.max.z:J.min.z,Z.distanceToPoint(n6)<0)return!1}return!0}containsPoint(J){let Q=this.planes;for(let $=0;$<6;$++)if(Q[$].distanceToPoint(J)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}var k9=new m0,M9=new b8;class vQ{constructor(){this.coordinateSystem=2000}intersectsObject(J,Q){if(!Q.isArrayCamera||Q.cameras.length===0)return!1;for(let $=0;$<Q.cameras.length;$++){let Z=Q.cameras[$];if(k9.multiplyMatrices(Z.projectionMatrix,Z.matrixWorldInverse),M9.setFromProjectionMatrix(k9,Z.coordinateSystem,Z.reversedDepth),M9.intersectsObject(J))return!0}return!1}intersectsSprite(J,Q){if(!Q||!Q.cameras||Q.cameras.length===0)return!1;for(let $=0;$<Q.cameras.length;$++){let Z=Q.cameras[$];if(k9.multiplyMatrices(Z.projectionMatrix,Z.matrixWorldInverse),M9.setFromProjectionMatrix(k9,Z.coordinateSystem,Z.reversedDepth),M9.intersectsSprite(J))return!0}return!1}intersectsSphere(J,Q){if(!Q||!Q.cameras||Q.cameras.length===0)return!1;for(let $=0;$<Q.cameras.length;$++){let Z=Q.cameras[$];if(k9.multiplyMatrices(Z.projectionMatrix,Z.matrixWorldInverse),M9.setFromProjectionMatrix(k9,Z.coordinateSystem,Z.reversedDepth),M9.intersectsSphere(J))return!0}return!1}intersectsBox(J,Q){if(!Q||!Q.cameras||Q.cameras.length===0)return!1;for(let $=0;$<Q.cameras.length;$++){let Z=Q.cameras[$];if(k9.multiplyMatrices(Z.projectionMatrix,Z.matrixWorldInverse),M9.setFromProjectionMatrix(k9,Z.coordinateSystem,Z.reversedDepth),M9.intersectsBox(J))return!0}return!1}containsPoint(J,Q){if(!Q||!Q.cameras||Q.cameras.length===0)return!1;for(let $=0;$<Q.cameras.length;$++){let Z=Q.cameras[$];if(k9.multiplyMatrices(Z.projectionMatrix,Z.matrixWorldInverse),M9.setFromProjectionMatrix(k9,Z.coordinateSystem,Z.reversedDepth),M9.containsPoint(J))return!0}return!1}clone(){return new vQ}}function n$(J,Q){return J-Q}function c5(J,Q){return J.z-Q.z}function n5(J,Q){return Q.z-J.z}class rY{constructor(){this.index=0,this.pool=[],this.list=[]}push(J,Q,$,Z){let W=this.pool,K=this.list;if(this.index>=W.length)W.push({start:-1,count:-1,z:-1,index:-1});let H=W[this.index];K.push(H),this.index++,H.start=J,H.count=Q,H.z=$,H.index=Z}reset(){this.list.length=0,this.index=0}}var lJ=new m0,s5=new M0(1,1,1),$H=new b8,i5=new vQ,s6=new jJ,D8=new TJ,p7=new _,ZH=new _,o5=new _,s$=new rY,hJ=new VJ,i6=[];function a5(J,Q,$=0){let Z=Q.itemSize;if(J.isInterleavedBufferAttribute||J.array.constructor!==Q.array.constructor){let W=J.count;for(let K=0;K<W;K++)for(let H=0;H<Z;H++)Q.setComponent(K+$,H,J.getComponent(K,H))}else Q.array.set(J.array,$*Z);Q.needsUpdate=!0}function O8(J,Q){if(J.constructor!==Q.constructor){let $=Math.min(J.length,Q.length);for(let Z=0;Z<$;Z++)Q[Z]=J[Z]}else{let $=Math.min(J.length,Q.length);Q.set(new J.constructor(J.buffer,0,$))}}class RW extends VJ{constructor(J,Q,$=Q*2,Z){super(new u0,Z);this.isBatchedMesh=!0,this.perObjectFrustumCulled=!0,this.sortObjects=!0,this.boundingBox=null,this.boundingSphere=null,this.customSort=null,this._instanceInfo=[],this._geometryInfo=[],this._availableInstanceIds=[],this._availableGeometryIds=[],this._nextIndexStart=0,this._nextVertexStart=0,this._geometryCount=0,this._visibilityChanged=!0,this._geometryInitialized=!1,this._maxInstanceCount=J,this._maxVertexCount=Q,this._maxIndexCount=$,this._multiDrawCounts=new Int32Array(J),this._multiDrawStarts=new Int32Array(J),this._multiDrawCount=0,this._multiDrawInstances=null,this._matricesTexture=null,this._indirectTexture=null,this._colorsTexture=null,this._initMatricesTexture(),this._initIndirectTexture()}get maxInstanceCount(){return this._maxInstanceCount}get instanceCount(){return this._instanceInfo.length-this._availableInstanceIds.length}get unusedVertexCount(){return this._maxVertexCount-this._nextVertexStart}get unusedIndexCount(){return this._maxIndexCount-this._nextIndexStart}_initMatricesTexture(){let J=Math.sqrt(this._maxInstanceCount*4);J=Math.ceil(J/4)*4,J=Math.max(J,4);let Q=new Float32Array(J*J*4),$=new W9(Q,J,J,1023,1015);this._matricesTexture=$}_initIndirectTexture(){let J=Math.sqrt(this._maxInstanceCount);J=Math.ceil(J);let Q=new Uint32Array(J*J),$=new W9(Q,J,J,1029,1014);this._indirectTexture=$}_initColorsTexture(){let J=Math.sqrt(this._maxInstanceCount);J=Math.ceil(J);let Q=new Float32Array(J*J*4).fill(1),$=new W9(Q,J,J,1023,1015);$.colorSpace=JJ.workingColorSpace,this._colorsTexture=$}_initializeGeometry(J){let Q=this.geometry,$=this._maxVertexCount,Z=this._maxIndexCount;if(this._geometryInitialized===!1){for(let W in J.attributes){let K=J.getAttribute(W),{array:H,itemSize:Y,normalized:X}=K,U=new H.constructor($*Y),N=new HJ(U,Y,X);Q.setAttribute(W,N)}if(J.getIndex()!==null){let W=$>65535?new Uint32Array(Z):new Uint16Array(Z);Q.setIndex(new HJ(W,1))}this._geometryInitialized=!0}}_validateGeometry(J){let Q=this.geometry;if(Boolean(J.getIndex())!==Boolean(Q.getIndex()))throw Error('THREE.BatchedMesh: All geometries must consistently have "index".');for(let $ in Q.attributes){if(!J.hasAttribute($))throw Error(`THREE.BatchedMesh: Added geometry missing "${$}". All geometries must have consistent attributes.`);let Z=J.getAttribute($),W=Q.getAttribute($);if(Z.itemSize!==W.itemSize||Z.normalized!==W.normalized)throw Error("THREE.BatchedMesh: All attributes must have a consistent itemSize and normalized value.")}}validateInstanceId(J){let Q=this._instanceInfo;if(J<0||J>=Q.length||Q[J].active===!1)throw Error(`THREE.BatchedMesh: Invalid instanceId ${J}. Instance is either out of range or has been deleted.`)}validateGeometryId(J){let Q=this._geometryInfo;if(J<0||J>=Q.length||Q[J].active===!1)throw Error(`THREE.BatchedMesh: Invalid geometryId ${J}. Geometry is either out of range or has been deleted.`)}setCustomSort(J){return this.customSort=J,this}computeBoundingBox(){if(this.boundingBox===null)this.boundingBox=new jJ;let J=this.boundingBox,Q=this._instanceInfo;J.makeEmpty();for(let $=0,Z=Q.length;$<Z;$++){if(Q[$].active===!1)continue;let W=Q[$].geometryIndex;this.getMatrixAt($,lJ),this.getBoundingBoxAt(W,s6).applyMatrix4(lJ),J.union(s6)}}computeBoundingSphere(){if(this.boundingSphere===null)this.boundingSphere=new TJ;let J=this.boundingSphere,Q=this._instanceInfo;J.makeEmpty();for(let $=0,Z=Q.length;$<Z;$++){if(Q[$].active===!1)continue;let W=Q[$].geometryIndex;this.getMatrixAt($,lJ),this.getBoundingSphereAt(W,D8).applyMatrix4(lJ),J.union(D8)}}addInstance(J){if(this._instanceInfo.length>=this.maxInstanceCount&&this._availableInstanceIds.length===0)throw Error("THREE.BatchedMesh: Maximum item count reached.");let $={visible:!0,active:!0,geometryIndex:J},Z=null;if(this._availableInstanceIds.length>0)this._availableInstanceIds.sort(n$),Z=this._availableInstanceIds.shift(),this._instanceInfo[Z]=$;else Z=this._instanceInfo.length,this._instanceInfo.push($);let W=this._matricesTexture;lJ.identity().toArray(W.image.data,Z*16),W.needsUpdate=!0;let K=this._colorsTexture;if(K)s5.toArray(K.image.data,Z*4),K.needsUpdate=!0;return this._visibilityChanged=!0,Z}addGeometry(J,Q=-1,$=-1){this._initializeGeometry(J),this._validateGeometry(J);let Z={vertexStart:-1,vertexCount:-1,reservedVertexCount:-1,indexStart:-1,indexCount:-1,reservedIndexCount:-1,start:-1,count:-1,boundingBox:null,boundingSphere:null,active:!0},W=this._geometryInfo;Z.vertexStart=this._nextVertexStart,Z.reservedVertexCount=Q===-1?J.getAttribute("position").count:Q;let K=J.getIndex();if(K!==null)Z.indexStart=this._nextIndexStart,Z.reservedIndexCount=$===-1?K.count:$;if(Z.indexStart!==-1&&Z.indexStart+Z.reservedIndexCount>this._maxIndexCount||Z.vertexStart+Z.reservedVertexCount>this._maxVertexCount)throw Error("THREE.BatchedMesh: Reserved space request exceeds the maximum buffer size.");let Y;if(this._availableGeometryIds.length>0)this._availableGeometryIds.sort(n$),Y=this._availableGeometryIds.shift(),W[Y]=Z;else Y=this._geometryCount,this._geometryCount++,W.push(Z);return this.setGeometryAt(Y,J),this._nextIndexStart=Z.indexStart+Z.reservedIndexCount,this._nextVertexStart=Z.vertexStart+Z.reservedVertexCount,Y}setGeometryAt(J,Q){if(J>=this._geometryCount)throw Error("THREE.BatchedMesh: Maximum geometry count reached.");this._validateGeometry(Q);let $=this.geometry,Z=$.getIndex()!==null,W=$.getIndex(),K=Q.getIndex(),H=this._geometryInfo[J];if(Z&&K.count>H.reservedIndexCount||Q.attributes.position.count>H.reservedVertexCount)throw Error("THREE.BatchedMesh: Reserved space not large enough for provided geometry.");let{vertexStart:Y,reservedVertexCount:X}=H;H.vertexCount=Q.getAttribute("position").count;for(let U in $.attributes){let N=Q.getAttribute(U),q=$.getAttribute(U);a5(N,q,Y);let G=N.itemSize;for(let E=N.count,O=X;E<O;E++){let R=Y+E;for(let D=0;D<G;D++)q.setComponent(R,D,0)}q.needsUpdate=!0,q.addUpdateRange(Y*G,X*G)}if(Z){let{indexStart:U,reservedIndexCount:N}=H;H.indexCount=Q.getIndex().count;for(let q=0;q<K.count;q++)W.setX(U+q,Y+K.getX(q));for(let q=K.count,G=N;q<G;q++)W.setX(U+q,Y);W.needsUpdate=!0,W.addUpdateRange(U,H.reservedIndexCount)}if(H.start=Z?H.indexStart:H.vertexStart,H.count=Z?H.indexCount:H.vertexCount,H.boundingBox=null,Q.boundingBox!==null)H.boundingBox=Q.boundingBox.clone();if(H.boundingSphere=null,Q.boundingSphere!==null)H.boundingSphere=Q.boundingSphere.clone();return this._visibilityChanged=!0,J}deleteGeometry(J){let Q=this._geometryInfo;if(J>=Q.length||Q[J].active===!1)return this;let $=this._instanceInfo;for(let Z=0,W=$.length;Z<W;Z++)if($[Z].active&&$[Z].geometryIndex===J)this.deleteInstance(Z);return Q[J].active=!1,this._availableGeometryIds.push(J),this._visibilityChanged=!0,this}deleteInstance(J){return this.validateInstanceId(J),this._instanceInfo[J].active=!1,this._availableInstanceIds.push(J),this._visibilityChanged=!0,this}optimize(){let J=0,Q=0,$=this._geometryInfo,Z=$.map((K,H)=>H).sort((K,H)=>{return $[K].vertexStart-$[H].vertexStart}),W=this.geometry;for(let K=0,H=$.length;K<H;K++){let Y=Z[K],X=$[Y];if(X.active===!1)continue;if(W.index!==null){if(X.indexStart!==Q){let{indexStart:U,vertexStart:N,reservedIndexCount:q}=X,G=W.index,E=G.array,O=J-N;for(let R=U;R<U+q;R++)E[R]=E[R]+O;G.array.copyWithin(Q,U,U+q),G.addUpdateRange(Q,q),G.needsUpdate=!0,X.indexStart=Q}Q+=X.reservedIndexCount}if(X.vertexStart!==J){let{vertexStart:U,reservedVertexCount:N}=X,q=W.attributes;for(let G in q){let E=q[G],{array:O,itemSize:R}=E;O.copyWithin(J*R,U*R,(U+N)*R),E.addUpdateRange(J*R,N*R),E.needsUpdate=!0}X.vertexStart=J}J+=X.reservedVertexCount,X.start=W.index?X.indexStart:X.vertexStart}return this._nextIndexStart=Q,this._nextVertexStart=J,this._visibilityChanged=!0,this}getBoundingBoxAt(J,Q){if(J>=this._geometryCount)return null;let $=this.geometry,Z=this._geometryInfo[J];if(Z.boundingBox===null){let W=new jJ,K=$.index,H=$.attributes.position;for(let Y=Z.start,X=Z.start+Z.count;Y<X;Y++){let U=Y;if(K)U=K.getX(U);W.expandByPoint(p7.fromBufferAttribute(H,U))}Z.boundingBox=W}return Q.copy(Z.boundingBox),Q}getBoundingSphereAt(J,Q){if(J>=this._geometryCount)return null;let $=this.geometry,Z=this._geometryInfo[J];if(Z.boundingSphere===null){let W=new TJ;this.getBoundingBoxAt(J,s6),s6.getCenter(W.center);let K=$.index,H=$.attributes.position,Y=0;for(let X=Z.start,U=Z.start+Z.count;X<U;X++){let N=X;if(K)N=K.getX(N);p7.fromBufferAttribute(H,N),Y=Math.max(Y,W.center.distanceToSquared(p7))}W.radius=Math.sqrt(Y),Z.boundingSphere=W}return Q.copy(Z.boundingSphere),Q}setMatrixAt(J,Q){this.validateInstanceId(J);let $=this._matricesTexture,Z=this._matricesTexture.image.data;return Q.toArray(Z,J*16),$.needsUpdate=!0,this}getMatrixAt(J,Q){return this.validateInstanceId(J),Q.fromArray(this._matricesTexture.image.data,J*16)}setColorAt(J,Q){if(this.validateInstanceId(J),this._colorsTexture===null)this._initColorsTexture();return Q.toArray(this._colorsTexture.image.data,J*4),this._colorsTexture.needsUpdate=!0,this}getColorAt(J,Q){return this.validateInstanceId(J),Q.fromArray(this._colorsTexture.image.data,J*4)}setVisibleAt(J,Q){if(this.validateInstanceId(J),this._instanceInfo[J].visible===Q)return this;return this._instanceInfo[J].visible=Q,this._visibilityChanged=!0,this}getVisibleAt(J){return this.validateInstanceId(J),this._instanceInfo[J].visible}setGeometryIdAt(J,Q){return this.validateInstanceId(J),this.validateGeometryId(Q),this._instanceInfo[J].geometryIndex=Q,this}getGeometryIdAt(J){return this.validateInstanceId(J),this._instanceInfo[J].geometryIndex}getGeometryRangeAt(J,Q={}){this.validateGeometryId(J);let $=this._geometryInfo[J];return Q.vertexStart=$.vertexStart,Q.vertexCount=$.vertexCount,Q.reservedVertexCount=$.reservedVertexCount,Q.indexStart=$.indexStart,Q.indexCount=$.indexCount,Q.reservedIndexCount=$.reservedIndexCount,Q.start=$.start,Q.count=$.count,Q}setInstanceCount(J){let Q=this._availableInstanceIds,$=this._instanceInfo;Q.sort(n$);while(Q[Q.length-1]===$.length-1)$.pop(),Q.pop();if(J<$.length)throw Error(`BatchedMesh: Instance ids outside the range ${J} are being used. Cannot shrink instance count.`);let Z=new Int32Array(J),W=new Int32Array(J);O8(this._multiDrawCounts,Z),O8(this._multiDrawStarts,W),this._multiDrawCounts=Z,this._multiDrawStarts=W,this._maxInstanceCount=J;let K=this._indirectTexture,H=this._matricesTexture,Y=this._colorsTexture;if(K.dispose(),this._initIndirectTexture(),O8(K.image.data,this._indirectTexture.image.data),H.dispose(),this._initMatricesTexture(),O8(H.image.data,this._matricesTexture.image.data),Y)Y.dispose(),this._initColorsTexture(),O8(Y.image.data,this._colorsTexture.image.data)}setGeometrySize(J,Q){let $=[...this._geometryInfo].filter((H)=>H.active);if(Math.max(...$.map((H)=>H.vertexStart+H.reservedVertexCount))>J)throw Error(`BatchedMesh: Geometry vertex values are being used outside the range ${Q}. Cannot shrink further.`);if(this.geometry.index){if(Math.max(...$.map((Y)=>Y.indexStart+Y.reservedIndexCount))>Q)throw Error(`BatchedMesh: Geometry index values are being used outside the range ${Q}. Cannot shrink further.`)}let W=this.geometry;if(W.dispose(),this._maxVertexCount=J,this._maxIndexCount=Q,this._geometryInitialized)this._geometryInitialized=!1,this.geometry=new u0,this._initializeGeometry(W);let K=this.geometry;if(W.index)O8(W.index.array,K.index.array);for(let H in W.attributes)O8(W.attributes[H].array,K.attributes[H].array)}raycast(J,Q){let $=this._instanceInfo,Z=this._geometryInfo,W=this.matrixWorld,K=this.geometry;if(hJ.material=this.material,hJ.geometry.index=K.index,hJ.geometry.attributes=K.attributes,hJ.geometry.boundingBox===null)hJ.geometry.boundingBox=new jJ;if(hJ.geometry.boundingSphere===null)hJ.geometry.boundingSphere=new TJ;for(let H=0,Y=$.length;H<Y;H++){if(!$[H].visible||!$[H].active)continue;let X=$[H].geometryIndex,U=Z[X];hJ.geometry.setDrawRange(U.start,U.count),this.getMatrixAt(H,hJ.matrixWorld).premultiply(W),this.getBoundingBoxAt(X,hJ.geometry.boundingBox),this.getBoundingSphereAt(X,hJ.geometry.boundingSphere),hJ.raycast(J,i6);for(let N=0,q=i6.length;N<q;N++){let G=i6[N];G.object=this,G.batchId=H,Q.push(G)}i6.length=0}hJ.material=null,hJ.geometry.index=null,hJ.geometry.attributes={},hJ.geometry.setDrawRange(0,1/0)}copy(J){if(super.copy(J),this.geometry=J.geometry.clone(),this.perObjectFrustumCulled=J.perObjectFrustumCulled,this.sortObjects=J.sortObjects,this.boundingBox=J.boundingBox!==null?J.boundingBox.clone():null,this.boundingSphere=J.boundingSphere!==null?J.boundingSphere.clone():null,this._geometryInfo=J._geometryInfo.map((Q)=>({...Q,boundingBox:Q.boundingBox!==null?Q.boundingBox.clone():null,boundingSphere:Q.boundingSphere!==null?Q.boundingSphere.clone():null})),this._instanceInfo=J._instanceInfo.map((Q)=>({...Q})),this._availableInstanceIds=J._availableInstanceIds.slice(),this._availableGeometryIds=J._availableGeometryIds.slice(),this._nextIndexStart=J._nextIndexStart,this._nextVertexStart=J._nextVertexStart,this._geometryCount=J._geometryCount,this._maxInstanceCount=J._maxInstanceCount,this._maxVertexCount=J._maxVertexCount,this._maxIndexCount=J._maxIndexCount,this._geometryInitialized=J._geometryInitialized,this._multiDrawCounts=J._multiDrawCounts.slice(),this._multiDrawStarts=J._multiDrawStarts.slice(),this._indirectTexture=J._indirectTexture.clone(),this._indirectTexture.image.data=this._indirectTexture.image.data.slice(),this._matricesTexture=J._matricesTexture.clone(),this._matricesTexture.image.data=this._matricesTexture.image.data.slice(),this._colorsTexture!==null)this._colorsTexture=J._colorsTexture.clone(),this._colorsTexture.image.data=this._colorsTexture.image.data.slice();return this}dispose(){if(this.geometry.dispose(),this._matricesTexture.dispose(),this._matricesTexture=null,this._indirectTexture.dispose(),this._indirectTexture=null,this._colorsTexture!==null)this._colorsTexture.dispose(),this._colorsTexture=null}onBeforeRender(J,Q,$,Z,W){if(!this._visibilityChanged&&!this.perObjectFrustumCulled&&!this.sortObjects)return;let K=Z.getIndex(),H=K===null?1:K.array.BYTES_PER_ELEMENT,Y=1;if(W.wireframe)Y=2,H=Z.attributes.position.count>65535?4:2;let X=this._instanceInfo,U=this._multiDrawStarts,N=this._multiDrawCounts,q=this._geometryInfo,G=this.perObjectFrustumCulled,E=this._indirectTexture,O=E.image.data,R=$.isArrayCamera?i5:$H;if(G&&!$.isArrayCamera)lJ.multiplyMatrices($.projectionMatrix,$.matrixWorldInverse).multiply(this.matrixWorld),$H.setFromProjectionMatrix(lJ,$.coordinateSystem,$.reversedDepth);let D=0;if(this.sortObjects){lJ.copy(this.matrixWorld).invert(),p7.setFromMatrixPosition($.matrixWorld).applyMatrix4(lJ),ZH.set(0,0,-1).transformDirection($.matrixWorld).transformDirection(lJ);for(let L=0,B=X.length;L<B;L++)if(X[L].visible&&X[L].active){let P=X[L].geometryIndex;this.getMatrixAt(L,lJ),this.getBoundingSphereAt(P,D8).applyMatrix4(lJ);let C=!1;if(G)C=!R.intersectsSphere(D8,$);if(!C){let w=q[P],k=o5.subVectors(D8.center,p7).dot(ZH);s$.push(w.start,w.count,k,L)}}let F=s$.list,M=this.customSort;if(M===null)F.sort(W.transparent?n5:c5);else M.call(this,F,$);for(let L=0,B=F.length;L<B;L++){let P=F[L];U[D]=P.start*H*Y,N[D]=P.count*Y,O[D]=P.index,D++}s$.reset()}else for(let F=0,M=X.length;F<M;F++)if(X[F].visible&&X[F].active){let L=X[F].geometryIndex,B=!1;if(G)this.getMatrixAt(F,lJ),this.getBoundingSphereAt(L,D8).applyMatrix4(lJ),B=!R.intersectsSphere(D8,$);if(!B){let P=q[L];U[D]=P.start*H*Y,N[D]=P.count*Y,O[D]=F,D++}}E.needsUpdate=!0,this._multiDrawCount=D,this._visibilityChanged=!1}onBeforeShadow(J,Q,$,Z,W,K){this.onBeforeRender(J,null,Z,W,K)}}class xJ extends yJ{constructor(J){super();this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new M0(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.linewidth=J.linewidth,this.linecap=J.linecap,this.linejoin=J.linejoin,this.fog=J.fog,this}}var FQ=new _,DQ=new _,WH=new m0,m7=new m9,o6=new TJ,i$=new _,KH=new _;class x9 extends $J{constructor(J=new u0,Q=new xJ){super();this.isLine=!0,this.type="Line",this.geometry=J,this.material=Q,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(J,Q){return super.copy(J,Q),this.material=Array.isArray(J.material)?J.material.slice():J.material,this.geometry=J.geometry,this}computeLineDistances(){let J=this.geometry;if(J.index===null){let Q=J.attributes.position,$=[0];for(let Z=1,W=Q.count;Z<W;Z++)FQ.fromBufferAttribute(Q,Z-1),DQ.fromBufferAttribute(Q,Z),$[Z]=$[Z-1],$[Z]+=FQ.distanceTo(DQ);J.setAttribute("lineDistance",new B0($,1))}else q0("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(J,Q){let $=this.geometry,Z=this.matrixWorld,W=J.params.Line.threshold,K=$.drawRange;if($.boundingSphere===null)$.computeBoundingSphere();if(o6.copy($.boundingSphere),o6.applyMatrix4(Z),o6.radius+=W,J.ray.intersectsSphere(o6)===!1)return;WH.copy(Z).invert(),m7.copy(J.ray).applyMatrix4(WH);let H=W/((this.scale.x+this.scale.y+this.scale.z)/3),Y=H*H,X=this.isLineSegments?2:1,U=$.index,q=$.attributes.position;if(U!==null){let G=Math.max(0,K.start),E=Math.min(U.count,K.start+K.count);for(let O=G,R=E-1;O<R;O+=X){let D=U.getX(O),F=U.getX(O+1),M=a6(this,J,m7,Y,D,F,O);if(M)Q.push(M)}if(this.isLineLoop){let O=U.getX(E-1),R=U.getX(G),D=a6(this,J,m7,Y,O,R,E-1);if(D)Q.push(D)}}else{let G=Math.max(0,K.start),E=Math.min(q.count,K.start+K.count);for(let O=G,R=E-1;O<R;O+=X){let D=a6(this,J,m7,Y,O,O+1,O);if(D)Q.push(D)}if(this.isLineLoop){let O=a6(this,J,m7,Y,E-1,G,E-1);if(O)Q.push(O)}}}updateMorphTargets(){let Q=this.geometry.morphAttributes,$=Object.keys(Q);if($.length>0){let Z=Q[$[0]];if(Z!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let W=0,K=Z.length;W<K;W++){let H=Z[W].name||String(W);this.morphTargetInfluences.push(0),this.morphTargetDictionary[H]=W}}}}}function a6(J,Q,$,Z,W,K,H){let Y=J.geometry.attributes.position;if(FQ.fromBufferAttribute(Y,W),DQ.fromBufferAttribute(Y,K),$.distanceSqToSegment(FQ,DQ,i$,KH)>Z)return;i$.applyMatrix4(J.matrixWorld);let U=Q.ray.origin.distanceTo(i$);if(U<Q.near||U>Q.far)return;return{distance:U,point:KH.clone().applyMatrix4(J.matrixWorld),index:H,face:null,faceIndex:null,barycoord:null,object:J}}var HH=new _,YH=new _;class D9 extends x9{constructor(J,Q){super(J,Q);this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let J=this.geometry;if(J.index===null){let Q=J.attributes.position,$=[];for(let Z=0,W=Q.count;Z<W;Z+=2)HH.fromBufferAttribute(Q,Z),YH.fromBufferAttribute(Q,Z+1),$[Z]=Z===0?0:$[Z-1],$[Z+1]=$[Z]+HH.distanceTo(YH);J.setAttribute("lineDistance",new B0($,1))}else q0("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class kW extends x9{constructor(J,Q){super(J,Q);this.isLineLoop=!0,this.type="LineLoop"}}class hQ extends yJ{constructor(J){super();this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new M0(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.alphaMap=J.alphaMap,this.size=J.size,this.sizeAttenuation=J.sizeAttenuation,this.fog=J.fog,this}}var XH=new m0,KZ=new m9,r6=new TJ,t6=new _;class MW extends $J{constructor(J=new u0,Q=new hQ){super();this.isPoints=!0,this.type="Points",this.geometry=J,this.material=Q,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(J,Q){return super.copy(J,Q),this.material=Array.isArray(J.material)?J.material.slice():J.material,this.geometry=J.geometry,this}raycast(J,Q){let $=this.geometry,Z=this.matrixWorld,W=J.params.Points.threshold,K=$.drawRange;if($.boundingSphere===null)$.computeBoundingSphere();if(r6.copy($.boundingSphere),r6.applyMatrix4(Z),r6.radius+=W,J.ray.intersectsSphere(r6)===!1)return;XH.copy(Z).invert(),KZ.copy(J.ray).applyMatrix4(XH);let H=W/((this.scale.x+this.scale.y+this.scale.z)/3),Y=H*H,X=$.index,N=$.attributes.position;if(X!==null){let q=Math.max(0,K.start),G=Math.min(X.count,K.start+K.count);for(let E=q,O=G;E<O;E++){let R=X.getX(E);t6.fromBufferAttribute(N,R),UH(t6,R,Y,Z,J,Q,this)}}else{let q=Math.max(0,K.start),G=Math.min(N.count,K.start+K.count);for(let E=q,O=G;E<O;E++)t6.fromBufferAttribute(N,E),UH(t6,E,Y,Z,J,Q,this)}}updateMorphTargets(){let Q=this.geometry.morphAttributes,$=Object.keys(Q);if($.length>0){let Z=Q[$[0]];if(Z!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let W=0,K=Z.length;W<K;W++){let H=Z[W].name||String(W);this.morphTargetInfluences.push(0),this.morphTargetDictionary[H]=W}}}}}function UH(J,Q,$,Z,W,K,H){let Y=KZ.distanceSqToPoint(J);if(Y<$){let X=new _;KZ.closestPointToPoint(J,X),X.applyMatrix4(Z);let U=W.ray.origin.distanceTo(X);if(U<W.near||U>W.far)return;K.push({distance:U,distanceToRay:Math.sqrt(Y),point:X,index:Q,face:null,faceIndex:null,barycoord:null,object:H})}}class LW extends kJ{constructor(J,Q,$,Z,W=1006,K=1006,H,Y,X){super(J,Q,$,Z,W,K,H,Y,X);this.isVideoTexture=!0,this.generateMipmaps=!1,this._requestVideoFrameCallbackId=0;let U=this;function N(){U.needsUpdate=!0,U._requestVideoFrameCallbackId=J.requestVideoFrameCallback(N)}if("requestVideoFrameCallback"in J)this._requestVideoFrameCallbackId=J.requestVideoFrameCallback(N)}clone(){return new this.constructor(this.image).copy(this)}update(){let J=this.image;if("requestVideoFrameCallback"in J===!1&&J.readyState>=J.HAVE_CURRENT_DATA)this.needsUpdate=!0}dispose(){if(this._requestVideoFrameCallbackId!==0)this.source.data.cancelVideoFrameCallback(this._requestVideoFrameCallbackId),this._requestVideoFrameCallbackId=0;super.dispose()}}class tY extends LW{constructor(J,Q,$,Z,W,K,H,Y){super({},J,Q,$,Z,W,K,H,Y);this.isVideoFrameTexture=!0}update(){}clone(){return new this.constructor().copy(this)}setFrame(J){this.image=J,this.needsUpdate=!0}}class eY extends kJ{constructor(J,Q){super({width:J,height:Q});this.isFramebufferTexture=!0,this.magFilter=1003,this.minFilter=1003,this.generateMipmaps=!1,this.needsUpdate=!0}}class G6 extends kJ{constructor(J,Q,$,Z,W,K,H,Y,X,U,N,q){super(null,K,H,Y,X,U,Z,W,N,q);this.isCompressedTexture=!0,this.image={width:Q,height:$},this.mipmaps=J,this.flipY=!1,this.generateMipmaps=!1}}class JX extends G6{constructor(J,Q,$,Z,W,K){super(J,Q,$,W,K);this.isCompressedArrayTexture=!0,this.image.depth=Z,this.wrapR=1001,this.layerUpdates=new Set}addLayerUpdate(J){this.layerUpdates.add(J)}clearLayerUpdates(){this.layerUpdates.clear()}}class QX extends G6{constructor(J,Q,$){super(void 0,J[0].width,J[0].height,Q,$,301);this.isCompressedCubeTexture=!0,this.isCubeTexture=!0,this.image=J}}class C7 extends kJ{constructor(J=[],Q=301,$,Z,W,K,H,Y,X,U){super(J,Q,$,Z,W,K,H,Y,X,U);this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(J){this.image=J}}class $X extends kJ{constructor(J,Q,$,Z,W,K,H,Y,X){super(J,Q,$,Z,W,K,H,Y,X);this.isCanvasTexture=!0,this.needsUpdate=!0}}class v8 extends kJ{constructor(J,Q,$=1014,Z,W,K,H=1003,Y=1003,X,U=1026,N=1){if(U!==1026&&U!==1027)throw Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let q={width:J,height:Q,depth:N};super(q,Z,W,K,H,Y,U,$,X);this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(J){return super.copy(J),this.source=new v9(Object.assign({},J.image)),this.compareFunction=J.compareFunction,this}toJSON(J){let Q=super.toJSON(J);if(this.compareFunction!==null)Q.compareFunction=this.compareFunction;return Q}}class VW extends v8{constructor(J,Q=1014,$=301,Z,W,K=1003,H=1003,Y,X=1026){let U={width:J,height:J,depth:1},N=[U,U,U,U,U,U];super(J,J,Q,$,Z,W,K,H,Y,X);this.image=N,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(J){this.image=J}}class xQ extends kJ{constructor(J=null){super();this.sourceTexture=J,this.isExternalTexture=!0}copy(J){return super.copy(J),this.sourceTexture=J.sourceTexture,this}}class h8 extends u0{constructor(J=1,Q=1,$=1,Z=1,W=1,K=1){super();this.type="BoxGeometry",this.parameters={width:J,height:Q,depth:$,widthSegments:Z,heightSegments:W,depthSegments:K};let H=this;Z=Math.floor(Z),W=Math.floor(W),K=Math.floor(K);let Y=[],X=[],U=[],N=[],q=0,G=0;E("z","y","x",-1,-1,$,Q,J,K,W,0),E("z","y","x",1,-1,$,Q,-J,K,W,1),E("x","z","y",1,1,J,$,Q,Z,K,2),E("x","z","y",1,-1,J,$,-Q,Z,K,3),E("x","y","z",1,-1,J,Q,$,Z,W,4),E("x","y","z",-1,-1,J,Q,-$,Z,W,5),this.setIndex(Y),this.setAttribute("position",new B0(X,3)),this.setAttribute("normal",new B0(U,3)),this.setAttribute("uv",new B0(N,2));function E(O,R,D,F,M,L,B,P,C,w,k){let A=L/C,h=B/w,S=L/2,v=B/2,l=P/2,f=C+1,c=w+1,x=0,m=0,Q0=new _;for(let $0=0;$0<c;$0++){let U0=$0*h-v;for(let _0=0;_0<f;_0++){let K0=_0*A-S;Q0[O]=K0*F,Q0[R]=U0*M,Q0[D]=l,X.push(Q0.x,Q0.y,Q0.z),Q0[O]=0,Q0[R]=0,Q0[D]=P>0?1:-1,U.push(Q0.x,Q0.y,Q0.z),N.push(_0/C),N.push(1-$0/w),x+=1}}for(let $0=0;$0<w;$0++)for(let U0=0;U0<C;U0++){let _0=q+U0+f*$0,K0=q+U0+f*($0+1),KJ=q+(U0+1)+f*($0+1),WJ=q+(U0+1)+f*$0;Y.push(_0,K0,WJ),Y.push(K0,KJ,WJ),m+=6}H.addGroup(G,m,k),G+=m,q+=x}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new h8(J.width,J.height,J.depth,J.widthSegments,J.heightSegments,J.depthSegments)}}class gQ extends u0{constructor(J=1,Q=1,$=4,Z=8,W=1){super();this.type="CapsuleGeometry",this.parameters={radius:J,height:Q,capSegments:$,radialSegments:Z,heightSegments:W},Q=Math.max(0,Q),$=Math.max(1,Math.floor($)),Z=Math.max(3,Math.floor(Z)),W=Math.max(1,Math.floor(W));let K=[],H=[],Y=[],X=[],U=Q/2,N=Math.PI/2*J,q=Q,G=2*N+q,E=$*2+W,O=Z+1,R=new _,D=new _;for(let F=0;F<=E;F++){let M=0,L=0,B=0,P=0;if(F<=$){let k=F/$,A=k*Math.PI/2;L=-U-J*Math.cos(A),B=J*Math.sin(A),P=-J*Math.cos(A),M=k*N}else if(F<=$+W){let k=(F-$)/W;L=-U+k*Q,B=J,P=0,M=N+k*q}else{let k=(F-$-W)/$,A=k*Math.PI/2;L=U+J*Math.sin(A),B=J*Math.cos(A),P=J*Math.sin(A),M=N+q+k*N}let C=Math.max(0,Math.min(1,M/G)),w=0;if(F===0)w=0.5/Z;else if(F===E)w=-0.5/Z;for(let k=0;k<=Z;k++){let A=k/Z,h=A*Math.PI*2,S=Math.sin(h),v=Math.cos(h);D.x=-B*v,D.y=L,D.z=B*S,H.push(D.x,D.y,D.z),R.set(-B*v,P,B*S),R.normalize(),Y.push(R.x,R.y,R.z),X.push(A+w,C)}if(F>0){let k=(F-1)*O;for(let A=0;A<Z;A++){let h=k+A,S=k+A+1,v=F*O+A,l=F*O+A+1;K.push(h,S,v),K.push(S,l,v)}}}this.setIndex(K),this.setAttribute("position",new B0(H,3)),this.setAttribute("normal",new B0(Y,3)),this.setAttribute("uv",new B0(X,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new gQ(J.radius,J.height,J.capSegments,J.radialSegments,J.heightSegments)}}class pQ extends u0{constructor(J=1,Q=32,$=0,Z=Math.PI*2){super();this.type="CircleGeometry",this.parameters={radius:J,segments:Q,thetaStart:$,thetaLength:Z},Q=Math.max(3,Q);let W=[],K=[],H=[],Y=[],X=new _,U=new s;K.push(0,0,0),H.push(0,0,1),Y.push(0.5,0.5);for(let N=0,q=3;N<=Q;N++,q+=3){let G=$+N/Q*Z;X.x=J*Math.cos(G),X.y=J*Math.sin(G),K.push(X.x,X.y,X.z),H.push(0,0,1),U.x=(K[q]/J+1)/2,U.y=(K[q+1]/J+1)/2,Y.push(U.x,U.y)}for(let N=1;N<=Q;N++)W.push(N,N+1,0);this.setIndex(W),this.setAttribute("position",new B0(K,3)),this.setAttribute("normal",new B0(H,3)),this.setAttribute("uv",new B0(Y,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new pQ(J.radius,J.segments,J.thetaStart,J.thetaLength)}}class N6 extends u0{constructor(J=1,Q=1,$=1,Z=32,W=1,K=!1,H=0,Y=Math.PI*2){super();this.type="CylinderGeometry",this.parameters={radiusTop:J,radiusBottom:Q,height:$,radialSegments:Z,heightSegments:W,openEnded:K,thetaStart:H,thetaLength:Y};let X=this;Z=Math.floor(Z),W=Math.floor(W);let U=[],N=[],q=[],G=[],E=0,O=[],R=$/2,D=0;if(F(),K===!1){if(J>0)M(!0);if(Q>0)M(!1)}this.setIndex(U),this.setAttribute("position",new B0(N,3)),this.setAttribute("normal",new B0(q,3)),this.setAttribute("uv",new B0(G,2));function F(){let L=new _,B=new _,P=0,C=(Q-J)/$;for(let w=0;w<=W;w++){let k=[],A=w/W,h=A*(Q-J)+J;for(let S=0;S<=Z;S++){let v=S/Z,l=v*Y+H,f=Math.sin(l),c=Math.cos(l);B.x=h*f,B.y=-A*$+R,B.z=h*c,N.push(B.x,B.y,B.z),L.set(f,C,c).normalize(),q.push(L.x,L.y,L.z),G.push(v,1-A),k.push(E++)}O.push(k)}for(let w=0;w<Z;w++)for(let k=0;k<W;k++){let A=O[k][w],h=O[k+1][w],S=O[k+1][w+1],v=O[k][w+1];if(J>0||k!==0)U.push(A,h,v),P+=3;if(Q>0||k!==W-1)U.push(h,S,v),P+=3}X.addGroup(D,P,0),D+=P}function M(L){let B=E,P=new s,C=new _,w=0,k=L===!0?J:Q,A=L===!0?1:-1;for(let S=1;S<=Z;S++)N.push(0,R*A,0),q.push(0,A,0),G.push(0.5,0.5),E++;let h=E;for(let S=0;S<=Z;S++){let l=S/Z*Y+H,f=Math.cos(l),c=Math.sin(l);C.x=k*c,C.y=R*A,C.z=k*f,N.push(C.x,C.y,C.z),q.push(0,A,0),P.x=f*0.5+0.5,P.y=c*0.5*A+0.5,G.push(P.x,P.y),E++}for(let S=0;S<Z;S++){let v=B+S,l=h+S;if(L===!0)U.push(l,l+1,v);else U.push(l+1,l,v);w+=3}X.addGroup(D,w,L===!0?1:2),D+=w}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new N6(J.radiusTop,J.radiusBottom,J.height,J.radialSegments,J.heightSegments,J.openEnded,J.thetaStart,J.thetaLength)}}class q6 extends N6{constructor(J=1,Q=1,$=32,Z=1,W=!1,K=0,H=Math.PI*2){super(0,J,Q,$,Z,W,K,H);this.type="ConeGeometry",this.parameters={radius:J,height:Q,radialSegments:$,heightSegments:Z,openEnded:W,thetaStart:K,thetaLength:H}}static fromJSON(J){return new q6(J.radius,J.height,J.radialSegments,J.heightSegments,J.openEnded,J.thetaStart,J.thetaLength)}}class K8 extends u0{constructor(J=[],Q=[],$=1,Z=0){super();this.type="PolyhedronGeometry",this.parameters={vertices:J,indices:Q,radius:$,detail:Z};let W=[],K=[];if(H(Z),X($),U(),this.setAttribute("position",new B0(W,3)),this.setAttribute("normal",new B0(W.slice(),3)),this.setAttribute("uv",new B0(K,2)),Z===0)this.computeVertexNormals();else this.normalizeNormals();function H(F){let M=new _,L=new _,B=new _;for(let P=0;P<Q.length;P+=3)G(Q[P+0],M),G(Q[P+1],L),G(Q[P+2],B),Y(M,L,B,F)}function Y(F,M,L,B){let P=B+1,C=[];for(let w=0;w<=P;w++){C[w]=[];let k=F.clone().lerp(L,w/P),A=M.clone().lerp(L,w/P),h=P-w;for(let S=0;S<=h;S++)if(S===0&&w===P)C[w][S]=k;else C[w][S]=k.clone().lerp(A,S/h)}for(let w=0;w<P;w++)for(let k=0;k<2*(P-w)-1;k++){let A=Math.floor(k/2);if(k%2===0)q(C[w][A+1]),q(C[w+1][A]),q(C[w][A]);else q(C[w][A+1]),q(C[w+1][A+1]),q(C[w+1][A])}}function X(F){let M=new _;for(let L=0;L<W.length;L+=3)M.x=W[L+0],M.y=W[L+1],M.z=W[L+2],M.normalize().multiplyScalar(F),W[L+0]=M.x,W[L+1]=M.y,W[L+2]=M.z}function U(){let F=new _;for(let M=0;M<W.length;M+=3){F.x=W[M+0],F.y=W[M+1],F.z=W[M+2];let L=R(F)/2/Math.PI+0.5,B=D(F)/Math.PI+0.5;K.push(L,1-B)}E(),N()}function N(){for(let F=0;F<K.length;F+=6){let M=K[F+0],L=K[F+2],B=K[F+4],P=Math.max(M,L,B),C=Math.min(M,L,B);if(P>0.9&&C<0.1){if(M<0.2)K[F+0]+=1;if(L<0.2)K[F+2]+=1;if(B<0.2)K[F+4]+=1}}}function q(F){W.push(F.x,F.y,F.z)}function G(F,M){let L=F*3;M.x=J[L+0],M.y=J[L+1],M.z=J[L+2]}function E(){let F=new _,M=new _,L=new _,B=new _,P=new s,C=new s,w=new s;for(let k=0,A=0;k<W.length;k+=9,A+=6){F.set(W[k+0],W[k+1],W[k+2]),M.set(W[k+3],W[k+4],W[k+5]),L.set(W[k+6],W[k+7],W[k+8]),P.set(K[A+0],K[A+1]),C.set(K[A+2],K[A+3]),w.set(K[A+4],K[A+5]),B.copy(F).add(M).add(L).divideScalar(3);let h=R(B);O(P,A+0,F,h),O(C,A+2,M,h),O(w,A+4,L,h)}}function O(F,M,L,B){if(B<0&&F.x===1)K[M]=F.x-1;if(L.x===0&&L.z===0)K[M]=B/2/Math.PI+0.5}function R(F){return Math.atan2(F.z,-F.x)}function D(F){return Math.atan2(-F.y,Math.sqrt(F.x*F.x+F.z*F.z))}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new K8(J.vertices,J.indices,J.radius,J.detail)}}class mQ extends K8{constructor(J=1,Q=0){let $=(1+Math.sqrt(5))/2,Z=1/$,W=[-1,-1,-1,-1,-1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,1,1,-1,1,1,1,0,-Z,-$,0,-Z,$,0,Z,-$,0,Z,$,-Z,-$,0,-Z,$,0,Z,-$,0,Z,$,0,-$,0,-Z,$,0,-Z,-$,0,Z,$,0,Z],K=[3,11,7,3,7,15,3,15,13,7,19,17,7,17,6,7,6,15,17,4,8,17,8,10,17,10,6,8,0,16,8,16,2,8,2,10,0,12,1,0,1,18,0,18,16,6,10,2,6,2,13,6,13,15,2,16,18,2,18,3,2,3,13,18,1,9,18,9,11,18,11,3,4,14,12,4,12,0,4,0,8,11,9,5,11,5,19,11,19,7,19,5,14,19,14,4,19,4,17,1,12,14,1,14,5,1,5,9];super(W,K,J,Q);this.type="DodecahedronGeometry",this.parameters={radius:J,detail:Q}}static fromJSON(J){return new mQ(J.radius,J.detail)}}var e6=new _,JQ=new _,o$=new _,QQ=new cJ;class BW extends u0{constructor(J=null,Q=1){super();if(this.type="EdgesGeometry",this.parameters={geometry:J,thresholdAngle:Q},J!==null){let Z=Math.pow(10,4),W=Math.cos(C8*Q),K=J.getIndex(),H=J.getAttribute("position"),Y=K?K.count:H.count,X=[0,0,0],U=["a","b","c"],N=[,,,],q={},G=[];for(let E=0;E<Y;E+=3){if(K)X[0]=K.getX(E),X[1]=K.getX(E+1),X[2]=K.getX(E+2);else X[0]=E,X[1]=E+1,X[2]=E+2;let{a:O,b:R,c:D}=QQ;if(O.fromBufferAttribute(H,X[0]),R.fromBufferAttribute(H,X[1]),D.fromBufferAttribute(H,X[2]),QQ.getNormal(o$),N[0]=`${Math.round(O.x*Z)},${Math.round(O.y*Z)},${Math.round(O.z*Z)}`,N[1]=`${Math.round(R.x*Z)},${Math.round(R.y*Z)},${Math.round(R.z*Z)}`,N[2]=`${Math.round(D.x*Z)},${Math.round(D.y*Z)},${Math.round(D.z*Z)}`,N[0]===N[1]||N[1]===N[2]||N[2]===N[0])continue;for(let F=0;F<3;F++){let M=(F+1)%3,L=N[F],B=N[M],P=QQ[U[F]],C=QQ[U[M]],w=`${L}_${B}`,k=`${B}_${L}`;if(k in q&&q[k]){if(o$.dot(q[k].normal)<=W)G.push(P.x,P.y,P.z),G.push(C.x,C.y,C.z);q[k]=null}else if(!(w in q))q[w]={index0:X[F],index1:X[M],normal:o$.clone()}}}for(let E in q)if(q[E]){let{index0:O,index1:R}=q[E];e6.fromBufferAttribute(H,O),JQ.fromBufferAttribute(H,R),G.push(e6.x,e6.y,e6.z),G.push(JQ.x,JQ.y,JQ.z)}this.setAttribute("position",new B0(G,3))}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}}class K9{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){q0("Curve: .getPoint() not implemented.")}getPointAt(J,Q){let $=this.getUtoTmapping(J);return this.getPoint($,Q)}getPoints(J=5){let Q=[];for(let $=0;$<=J;$++)Q.push(this.getPoint($/J));return Q}getSpacedPoints(J=5){let Q=[];for(let $=0;$<=J;$++)Q.push(this.getPointAt($/J));return Q}getLength(){let J=this.getLengths();return J[J.length-1]}getLengths(J=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===J+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let Q=[],$,Z=this.getPoint(0),W=0;Q.push(0);for(let K=1;K<=J;K++)$=this.getPoint(K/J),W+=$.distanceTo(Z),Q.push(W),Z=$;return this.cacheArcLengths=Q,Q}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(J,Q=null){let $=this.getLengths(),Z=0,W=$.length,K;if(Q)K=Q;else K=J*$[W-1];let H=0,Y=W-1,X;while(H<=Y)if(Z=Math.floor(H+(Y-H)/2),X=$[Z]-K,X<0)H=Z+1;else if(X>0)Y=Z-1;else{Y=Z;break}if(Z=Y,$[Z]===K)return Z/(W-1);let U=$[Z],q=$[Z+1]-U,G=(K-U)/q;return(Z+G)/(W-1)}getTangent(J,Q){let Z=J-0.0001,W=J+0.0001;if(Z<0)Z=0;if(W>1)W=1;let K=this.getPoint(Z),H=this.getPoint(W),Y=Q||(K.isVector2?new s:new _);return Y.copy(H).sub(K).normalize(),Y}getTangentAt(J,Q){let $=this.getUtoTmapping(J);return this.getTangent($,Q)}computeFrenetFrames(J,Q=!1){let $=new _,Z=[],W=[],K=[],H=new _,Y=new m0;for(let G=0;G<=J;G++){let E=G/J;Z[G]=this.getTangentAt(E,new _)}W[0]=new _,K[0]=new _;let X=Number.MAX_VALUE,U=Math.abs(Z[0].x),N=Math.abs(Z[0].y),q=Math.abs(Z[0].z);if(U<=X)X=U,$.set(1,0,0);if(N<=X)X=N,$.set(0,1,0);if(q<=X)$.set(0,0,1);H.crossVectors(Z[0],$).normalize(),W[0].crossVectors(Z[0],H),K[0].crossVectors(Z[0],W[0]);for(let G=1;G<=J;G++){if(W[G]=W[G-1].clone(),K[G]=K[G-1].clone(),H.crossVectors(Z[G-1],Z[G]),H.length()>Number.EPSILON){H.normalize();let E=Math.acos(p0(Z[G-1].dot(Z[G]),-1,1));W[G].applyMatrix4(Y.makeRotationAxis(H,E))}K[G].crossVectors(Z[G],W[G])}if(Q===!0){let G=Math.acos(p0(W[0].dot(W[J]),-1,1));if(G/=J,Z[0].dot(H.crossVectors(W[0],W[J]))>0)G=-G;for(let E=1;E<=J;E++)W[E].applyMatrix4(Y.makeRotationAxis(Z[E],G*E)),K[E].crossVectors(Z[E],W[E])}return{tangents:Z,normals:W,binormals:K}}clone(){return new this.constructor().copy(this)}copy(J){return this.arcLengthDivisions=J.arcLengthDivisions,this}toJSON(){let J={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return J.arcLengthDivisions=this.arcLengthDivisions,J.type=this.type,J}fromJSON(J){return this.arcLengthDivisions=J.arcLengthDivisions,this}}class E6 extends K9{constructor(J=0,Q=0,$=1,Z=1,W=0,K=Math.PI*2,H=!1,Y=0){super();this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=J,this.aY=Q,this.xRadius=$,this.yRadius=Z,this.aStartAngle=W,this.aEndAngle=K,this.aClockwise=H,this.aRotation=Y}getPoint(J,Q=new s){let $=Q,Z=Math.PI*2,W=this.aEndAngle-this.aStartAngle,K=Math.abs(W)<Number.EPSILON;while(W<0)W+=Z;while(W>Z)W-=Z;if(W<Number.EPSILON)if(K)W=0;else W=Z;if(this.aClockwise===!0&&!K)if(W===Z)W=-Z;else W=W-Z;let H=this.aStartAngle+J*W,Y=this.aX+this.xRadius*Math.cos(H),X=this.aY+this.yRadius*Math.sin(H);if(this.aRotation!==0){let U=Math.cos(this.aRotation),N=Math.sin(this.aRotation),q=Y-this.aX,G=X-this.aY;Y=q*U-G*N+this.aX,X=q*N+G*U+this.aY}return $.set(Y,X)}copy(J){return super.copy(J),this.aX=J.aX,this.aY=J.aY,this.xRadius=J.xRadius,this.yRadius=J.yRadius,this.aStartAngle=J.aStartAngle,this.aEndAngle=J.aEndAngle,this.aClockwise=J.aClockwise,this.aRotation=J.aRotation,this}toJSON(){let J=super.toJSON();return J.aX=this.aX,J.aY=this.aY,J.xRadius=this.xRadius,J.yRadius=this.yRadius,J.aStartAngle=this.aStartAngle,J.aEndAngle=this.aEndAngle,J.aClockwise=this.aClockwise,J.aRotation=this.aRotation,J}fromJSON(J){return super.fromJSON(J),this.aX=J.aX,this.aY=J.aY,this.xRadius=J.xRadius,this.yRadius=J.yRadius,this.aStartAngle=J.aStartAngle,this.aEndAngle=J.aEndAngle,this.aClockwise=J.aClockwise,this.aRotation=J.aRotation,this}}class zW extends E6{constructor(J,Q,$,Z,W,K){super(J,Q,$,$,Z,W,K);this.isArcCurve=!0,this.type="ArcCurve"}}function IW(){let J=0,Q=0,$=0,Z=0;function W(K,H,Y,X){J=K,Q=Y,$=-3*K+3*H-2*Y-X,Z=2*K-2*H+Y+X}return{initCatmullRom:function(K,H,Y,X,U){W(H,Y,U*(Y-K),U*(X-H))},initNonuniformCatmullRom:function(K,H,Y,X,U,N,q){let G=(H-K)/U-(Y-K)/(U+N)+(Y-H)/N,E=(Y-H)/N-(X-H)/(N+q)+(X-Y)/q;G*=N,E*=N,W(H,Y,G,E)},calc:function(K){let H=K*K,Y=H*K;return J+Q*K+$*H+Z*Y}}}var $Q=new _,a$=new IW,r$=new IW,t$=new IW;class CW extends K9{constructor(J=[],Q=!1,$="centripetal",Z=0.5){super();this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=J,this.closed=Q,this.curveType=$,this.tension=Z}getPoint(J,Q=new _){let $=Q,Z=this.points,W=Z.length,K=(W-(this.closed?0:1))*J,H=Math.floor(K),Y=K-H;if(this.closed)H+=H>0?0:(Math.floor(Math.abs(H)/W)+1)*W;else if(Y===0&&H===W-1)H=W-2,Y=1;let X,U;if(this.closed||H>0)X=Z[(H-1)%W];else $Q.subVectors(Z[0],Z[1]).add(Z[0]),X=$Q;let N=Z[H%W],q=Z[(H+1)%W];if(this.closed||H+2<W)U=Z[(H+2)%W];else $Q.subVectors(Z[W-1],Z[W-2]).add(Z[W-1]),U=$Q;if(this.curveType==="centripetal"||this.curveType==="chordal"){let G=this.curveType==="chordal"?0.5:0.25,E=Math.pow(X.distanceToSquared(N),G),O=Math.pow(N.distanceToSquared(q),G),R=Math.pow(q.distanceToSquared(U),G);if(O<0.0001)O=1;if(E<0.0001)E=O;if(R<0.0001)R=O;a$.initNonuniformCatmullRom(X.x,N.x,q.x,U.x,E,O,R),r$.initNonuniformCatmullRom(X.y,N.y,q.y,U.y,E,O,R),t$.initNonuniformCatmullRom(X.z,N.z,q.z,U.z,E,O,R)}else if(this.curveType==="catmullrom")a$.initCatmullRom(X.x,N.x,q.x,U.x,this.tension),r$.initCatmullRom(X.y,N.y,q.y,U.y,this.tension),t$.initCatmullRom(X.z,N.z,q.z,U.z,this.tension);return $.set(a$.calc(Y),r$.calc(Y),t$.calc(Y)),$}copy(J){super.copy(J),this.points=[];for(let Q=0,$=J.points.length;Q<$;Q++){let Z=J.points[Q];this.points.push(Z.clone())}return this.closed=J.closed,this.curveType=J.curveType,this.tension=J.tension,this}toJSON(){let J=super.toJSON();J.points=[];for(let Q=0,$=this.points.length;Q<$;Q++){let Z=this.points[Q];J.points.push(Z.toArray())}return J.closed=this.closed,J.curveType=this.curveType,J.tension=this.tension,J}fromJSON(J){super.fromJSON(J),this.points=[];for(let Q=0,$=J.points.length;Q<$;Q++){let Z=J.points[Q];this.points.push(new _().fromArray(Z))}return this.closed=J.closed,this.curveType=J.curveType,this.tension=J.tension,this}}function GH(J,Q,$,Z,W){let K=(Z-Q)*0.5,H=(W-$)*0.5,Y=J*J,X=J*Y;return(2*$-2*Z+K+H)*X+(-3*$+3*Z-2*K-H)*Y+K*J+$}function r5(J,Q){let $=1-J;return $*$*Q}function t5(J,Q){return 2*(1-J)*J*Q}function e5(J,Q){return J*J*Q}function c7(J,Q,$,Z){return r5(J,Q)+t5(J,$)+e5(J,Z)}function JN(J,Q){let $=1-J;return $*$*$*Q}function QN(J,Q){let $=1-J;return 3*$*$*J*Q}function $N(J,Q){return 3*(1-J)*J*J*Q}function ZN(J,Q){return J*J*J*Q}function n7(J,Q,$,Z,W){return JN(J,Q)+QN(J,$)+$N(J,Z)+ZN(J,W)}class dQ extends K9{constructor(J=new s,Q=new s,$=new s,Z=new s){super();this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=J,this.v1=Q,this.v2=$,this.v3=Z}getPoint(J,Q=new s){let $=Q,Z=this.v0,W=this.v1,K=this.v2,H=this.v3;return $.set(n7(J,Z.x,W.x,K.x,H.x),n7(J,Z.y,W.y,K.y,H.y)),$}copy(J){return super.copy(J),this.v0.copy(J.v0),this.v1.copy(J.v1),this.v2.copy(J.v2),this.v3.copy(J.v3),this}toJSON(){let J=super.toJSON();return J.v0=this.v0.toArray(),J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J.v3=this.v3.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v0.fromArray(J.v0),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this.v3.fromArray(J.v3),this}}class wW extends K9{constructor(J=new _,Q=new _,$=new _,Z=new _){super();this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=J,this.v1=Q,this.v2=$,this.v3=Z}getPoint(J,Q=new _){let $=Q,Z=this.v0,W=this.v1,K=this.v2,H=this.v3;return $.set(n7(J,Z.x,W.x,K.x,H.x),n7(J,Z.y,W.y,K.y,H.y),n7(J,Z.z,W.z,K.z,H.z)),$}copy(J){return super.copy(J),this.v0.copy(J.v0),this.v1.copy(J.v1),this.v2.copy(J.v2),this.v3.copy(J.v3),this}toJSON(){let J=super.toJSON();return J.v0=this.v0.toArray(),J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J.v3=this.v3.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v0.fromArray(J.v0),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this.v3.fromArray(J.v3),this}}class lQ extends K9{constructor(J=new s,Q=new s){super();this.isLineCurve=!0,this.type="LineCurve",this.v1=J,this.v2=Q}getPoint(J,Q=new s){let $=Q;if(J===1)$.copy(this.v2);else $.copy(this.v2).sub(this.v1),$.multiplyScalar(J).add(this.v1);return $}getPointAt(J,Q){return this.getPoint(J,Q)}getTangent(J,Q=new s){return Q.subVectors(this.v2,this.v1).normalize()}getTangentAt(J,Q){return this.getTangent(J,Q)}copy(J){return super.copy(J),this.v1.copy(J.v1),this.v2.copy(J.v2),this}toJSON(){let J=super.toJSON();return J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this}}class AW extends K9{constructor(J=new _,Q=new _){super();this.isLineCurve3=!0,this.type="LineCurve3",this.v1=J,this.v2=Q}getPoint(J,Q=new _){let $=Q;if(J===1)$.copy(this.v2);else $.copy(this.v2).sub(this.v1),$.multiplyScalar(J).add(this.v1);return $}getPointAt(J,Q){return this.getPoint(J,Q)}getTangent(J,Q=new _){return Q.subVectors(this.v2,this.v1).normalize()}getTangentAt(J,Q){return this.getTangent(J,Q)}copy(J){return super.copy(J),this.v1.copy(J.v1),this.v2.copy(J.v2),this}toJSON(){let J=super.toJSON();return J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this}}class uQ extends K9{constructor(J=new s,Q=new s,$=new s){super();this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=J,this.v1=Q,this.v2=$}getPoint(J,Q=new s){let $=Q,Z=this.v0,W=this.v1,K=this.v2;return $.set(c7(J,Z.x,W.x,K.x),c7(J,Z.y,W.y,K.y)),$}copy(J){return super.copy(J),this.v0.copy(J.v0),this.v1.copy(J.v1),this.v2.copy(J.v2),this}toJSON(){let J=super.toJSON();return J.v0=this.v0.toArray(),J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v0.fromArray(J.v0),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this}}class cQ extends K9{constructor(J=new _,Q=new _,$=new _){super();this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=J,this.v1=Q,this.v2=$}getPoint(J,Q=new _){let $=Q,Z=this.v0,W=this.v1,K=this.v2;return $.set(c7(J,Z.x,W.x,K.x),c7(J,Z.y,W.y,K.y),c7(J,Z.z,W.z,K.z)),$}copy(J){return super.copy(J),this.v0.copy(J.v0),this.v1.copy(J.v1),this.v2.copy(J.v2),this}toJSON(){let J=super.toJSON();return J.v0=this.v0.toArray(),J.v1=this.v1.toArray(),J.v2=this.v2.toArray(),J}fromJSON(J){return super.fromJSON(J),this.v0.fromArray(J.v0),this.v1.fromArray(J.v1),this.v2.fromArray(J.v2),this}}class nQ extends K9{constructor(J=[]){super();this.isSplineCurve=!0,this.type="SplineCurve",this.points=J}getPoint(J,Q=new s){let $=Q,Z=this.points,W=(Z.length-1)*J,K=Math.floor(W),H=W-K,Y=Z[K===0?K:K-1],X=Z[K],U=Z[K>Z.length-2?Z.length-1:K+1],N=Z[K>Z.length-3?Z.length-1:K+2];return $.set(GH(H,Y.x,X.x,U.x,N.x),GH(H,Y.y,X.y,U.y,N.y)),$}copy(J){super.copy(J),this.points=[];for(let Q=0,$=J.points.length;Q<$;Q++){let Z=J.points[Q];this.points.push(Z.clone())}return this}toJSON(){let J=super.toJSON();J.points=[];for(let Q=0,$=this.points.length;Q<$;Q++){let Z=this.points[Q];J.points.push(Z.toArray())}return J}fromJSON(J){super.fromJSON(J),this.points=[];for(let Q=0,$=J.points.length;Q<$;Q++){let Z=J.points[Q];this.points.push(new s().fromArray(Z))}return this}}var OQ=Object.freeze({__proto__:null,ArcCurve:zW,CatmullRomCurve3:CW,CubicBezierCurve:dQ,CubicBezierCurve3:wW,EllipseCurve:E6,LineCurve:lQ,LineCurve3:AW,QuadraticBezierCurve:uQ,QuadraticBezierCurve3:cQ,SplineCurve:nQ});class _W extends K9{constructor(){super();this.type="CurvePath",this.curves=[],this.autoClose=!1}add(J){this.curves.push(J)}closePath(){let J=this.curves[0].getPoint(0),Q=this.curves[this.curves.length-1].getPoint(1);if(!J.equals(Q)){let $=J.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new OQ[$](Q,J))}return this}getPoint(J,Q){let $=J*this.getLength(),Z=this.getCurveLengths(),W=0;while(W<Z.length){if(Z[W]>=$){let K=Z[W]-$,H=this.curves[W],Y=H.getLength(),X=Y===0?0:1-K/Y;return H.getPointAt(X,Q)}W++}return null}getLength(){let J=this.getCurveLengths();return J[J.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let J=[],Q=0;for(let $=0,Z=this.curves.length;$<Z;$++)Q+=this.curves[$].getLength(),J.push(Q);return this.cacheLengths=J,J}getSpacedPoints(J=40){let Q=[];for(let $=0;$<=J;$++)Q.push(this.getPoint($/J));if(this.autoClose)Q.push(Q[0]);return Q}getPoints(J=12){let Q=[],$;for(let Z=0,W=this.curves;Z<W.length;Z++){let K=W[Z],H=K.isEllipseCurve?J*2:K.isLineCurve||K.isLineCurve3?1:K.isSplineCurve?J*K.points.length:J,Y=K.getPoints(H);for(let X=0;X<Y.length;X++){let U=Y[X];if($&&$.equals(U))continue;Q.push(U),$=U}}if(this.autoClose&&Q.length>1&&!Q[Q.length-1].equals(Q[0]))Q.push(Q[0]);return Q}copy(J){super.copy(J),this.curves=[];for(let Q=0,$=J.curves.length;Q<$;Q++){let Z=J.curves[Q];this.curves.push(Z.clone())}return this.autoClose=J.autoClose,this}toJSON(){let J=super.toJSON();J.autoClose=this.autoClose,J.curves=[];for(let Q=0,$=this.curves.length;Q<$;Q++){let Z=this.curves[Q];J.curves.push(Z.toJSON())}return J}fromJSON(J){super.fromJSON(J),this.autoClose=J.autoClose,this.curves=[];for(let Q=0,$=J.curves.length;Q<$;Q++){let Z=J.curves[Q];this.curves.push(new OQ[Z.type]().fromJSON(Z))}return this}}class o7 extends _W{constructor(J){super();if(this.type="Path",this.currentPoint=new s,J)this.setFromPoints(J)}setFromPoints(J){this.moveTo(J[0].x,J[0].y);for(let Q=1,$=J.length;Q<$;Q++)this.lineTo(J[Q].x,J[Q].y);return this}moveTo(J,Q){return this.currentPoint.set(J,Q),this}lineTo(J,Q){let $=new lQ(this.currentPoint.clone(),new s(J,Q));return this.curves.push($),this.currentPoint.set(J,Q),this}quadraticCurveTo(J,Q,$,Z){let W=new uQ(this.currentPoint.clone(),new s(J,Q),new s($,Z));return this.curves.push(W),this.currentPoint.set($,Z),this}bezierCurveTo(J,Q,$,Z,W,K){let H=new dQ(this.currentPoint.clone(),new s(J,Q),new s($,Z),new s(W,K));return this.curves.push(H),this.currentPoint.set(W,K),this}splineThru(J){let Q=[this.currentPoint.clone()].concat(J),$=new nQ(Q);return this.curves.push($),this.currentPoint.copy(J[J.length-1]),this}arc(J,Q,$,Z,W,K){let H=this.currentPoint.x,Y=this.currentPoint.y;return this.absarc(J+H,Q+Y,$,Z,W,K),this}absarc(J,Q,$,Z,W,K){return this.absellipse(J,Q,$,$,Z,W,K),this}ellipse(J,Q,$,Z,W,K,H,Y){let X=this.currentPoint.x,U=this.currentPoint.y;return this.absellipse(J+X,Q+U,$,Z,W,K,H,Y),this}absellipse(J,Q,$,Z,W,K,H,Y){let X=new E6(J,Q,$,Z,W,K,H,Y);if(this.curves.length>0){let N=X.getPoint(0);if(!N.equals(this.currentPoint))this.lineTo(N.x,N.y)}this.curves.push(X);let U=X.getPoint(1);return this.currentPoint.copy(U),this}copy(J){return super.copy(J),this.currentPoint.copy(J.currentPoint),this}toJSON(){let J=super.toJSON();return J.currentPoint=this.currentPoint.toArray(),J}fromJSON(J){return super.fromJSON(J),this.currentPoint.fromArray(J.currentPoint),this}}class e9 extends o7{constructor(J){super(J);this.uuid=eJ(),this.type="Shape",this.holes=[]}getPointsHoles(J){let Q=[];for(let $=0,Z=this.holes.length;$<Z;$++)Q[$]=this.holes[$].getPoints(J);return Q}extractPoints(J){return{shape:this.getPoints(J),holes:this.getPointsHoles(J)}}copy(J){super.copy(J),this.holes=[];for(let Q=0,$=J.holes.length;Q<$;Q++){let Z=J.holes[Q];this.holes.push(Z.clone())}return this}toJSON(){let J=super.toJSON();J.uuid=this.uuid,J.holes=[];for(let Q=0,$=this.holes.length;Q<$;Q++){let Z=this.holes[Q];J.holes.push(Z.toJSON())}return J}fromJSON(J){super.fromJSON(J),this.uuid=J.uuid,this.holes=[];for(let Q=0,$=J.holes.length;Q<$;Q++){let Z=J.holes[Q];this.holes.push(new o7().fromJSON(Z))}return this}}function WN(J,Q,$=2){let Z=Q&&Q.length,W=Z?Q[0]*$:J.length,K=ZX(J,0,W,$,!0),H=[];if(!K||K.next===K.prev)return H;let Y,X,U;if(Z)K=UN(J,Q,K,$);if(J.length>80*$){Y=J[0],X=J[1];let N=Y,q=X;for(let G=$;G<W;G+=$){let E=J[G],O=J[G+1];if(E<Y)Y=E;if(O<X)X=O;if(E>N)N=E;if(O>q)q=O}U=Math.max(N-Y,q-X),U=U!==0?32767/U:0}return a7(K,H,$,Y,X,U,0),H}function ZX(J,Q,$,Z,W){let K;if(W===LN(J,Q,$,Z)>0)for(let H=Q;H<$;H+=Z)K=NH(H/Z|0,J[H],J[H+1],K);else for(let H=$-Z;H>=Q;H-=Z)K=NH(H/Z|0,J[H],J[H+1],K);if(K&&F7(K,K.next))t7(K),K=K.next;return K}function P8(J,Q){if(!J)return J;if(!Q)Q=J;let $=J,Z;do if(Z=!1,!$.steiner&&(F7($,$.next)||DJ($.prev,$,$.next)===0)){if(t7($),$=Q=$.prev,$===$.next)break;Z=!0}else $=$.next;while(Z||$!==Q);return Q}function a7(J,Q,$,Z,W,K,H){if(!J)return;if(!H&&K)FN(J,Z,W,K);let Y=J;while(J.prev!==J.next){let{prev:X,next:U}=J;if(K?HN(J,Z,W,K):KN(J)){Q.push(X.i,J.i,U.i),t7(J),J=U.next,Y=U.next;continue}if(J=U,J===Y){if(!H)a7(P8(J),Q,$,Z,W,K,1);else if(H===1)J=YN(P8(J),Q),a7(J,Q,$,Z,W,K,2);else if(H===2)XN(J,Q,$,Z,W,K);break}}}function KN(J){let Q=J.prev,$=J,Z=J.next;if(DJ(Q,$,Z)>=0)return!1;let W=Q.x,K=$.x,H=Z.x,Y=Q.y,X=$.y,U=Z.y,N=Math.min(W,K,H),q=Math.min(Y,X,U),G=Math.max(W,K,H),E=Math.max(Y,X,U),O=Z.next;while(O!==Q){if(O.x>=N&&O.x<=G&&O.y>=q&&O.y<=E&&l7(W,Y,K,X,H,U,O.x,O.y)&&DJ(O.prev,O,O.next)>=0)return!1;O=O.next}return!0}function HN(J,Q,$,Z){let W=J.prev,K=J,H=J.next;if(DJ(W,K,H)>=0)return!1;let Y=W.x,X=K.x,U=H.x,N=W.y,q=K.y,G=H.y,E=Math.min(Y,X,U),O=Math.min(N,q,G),R=Math.max(Y,X,U),D=Math.max(N,q,G),F=HZ(E,O,Q,$,Z),M=HZ(R,D,Q,$,Z),L=J.prevZ,B=J.nextZ;while(L&&L.z>=F&&B&&B.z<=M){if(L.x>=E&&L.x<=R&&L.y>=O&&L.y<=D&&L!==W&&L!==H&&l7(Y,N,X,q,U,G,L.x,L.y)&&DJ(L.prev,L,L.next)>=0)return!1;if(L=L.prevZ,B.x>=E&&B.x<=R&&B.y>=O&&B.y<=D&&B!==W&&B!==H&&l7(Y,N,X,q,U,G,B.x,B.y)&&DJ(B.prev,B,B.next)>=0)return!1;B=B.nextZ}while(L&&L.z>=F){if(L.x>=E&&L.x<=R&&L.y>=O&&L.y<=D&&L!==W&&L!==H&&l7(Y,N,X,q,U,G,L.x,L.y)&&DJ(L.prev,L,L.next)>=0)return!1;L=L.prevZ}while(B&&B.z<=M){if(B.x>=E&&B.x<=R&&B.y>=O&&B.y<=D&&B!==W&&B!==H&&l7(Y,N,X,q,U,G,B.x,B.y)&&DJ(B.prev,B,B.next)>=0)return!1;B=B.nextZ}return!0}function YN(J,Q){let $=J;do{let Z=$.prev,W=$.next.next;if(!F7(Z,W)&&KX(Z,$,$.next,W)&&r7(Z,W)&&r7(W,Z))Q.push(Z.i,$.i,W.i),t7($),t7($.next),$=J=W;$=$.next}while($!==J);return P8($)}function XN(J,Q,$,Z,W,K){let H=J;do{let Y=H.next.next;while(Y!==H.prev){if(H.i!==Y.i&&RN(H,Y)){let X=HX(H,Y);H=P8(H,H.next),X=P8(X,X.next),a7(H,Q,$,Z,W,K,0),a7(X,Q,$,Z,W,K,0);return}Y=Y.next}H=H.next}while(H!==J)}function UN(J,Q,$,Z){let W=[];for(let K=0,H=Q.length;K<H;K++){let Y=Q[K]*Z,X=K<H-1?Q[K+1]*Z:J.length,U=ZX(J,Y,X,Z,!1);if(U===U.next)U.steiner=!0;W.push(ON(U))}W.sort(GN);for(let K=0;K<W.length;K++)$=NN(W[K],$);return $}function GN(J,Q){let $=J.x-Q.x;if($===0){if($=J.y-Q.y,$===0){let Z=(J.next.y-J.y)/(J.next.x-J.x),W=(Q.next.y-Q.y)/(Q.next.x-Q.x);$=Z-W}}return $}function NN(J,Q){let $=qN(J,Q);if(!$)return Q;let Z=HX($,J);return P8(Z,Z.next),P8($,$.next)}function qN(J,Q){let $=Q,Z=J.x,W=J.y,K=-1/0,H;if(F7(J,$))return $;do{if(F7(J,$.next))return $.next;else if(W<=$.y&&W>=$.next.y&&$.next.y!==$.y){let q=$.x+(W-$.y)*($.next.x-$.x)/($.next.y-$.y);if(q<=Z&&q>K){if(K=q,H=$.x<$.next.x?$:$.next,q===Z)return H}}$=$.next}while($!==Q);if(!H)return null;let Y=H,X=H.x,U=H.y,N=1/0;$=H;do{if(Z>=$.x&&$.x>=X&&Z!==$.x&&WX(W<U?Z:K,W,X,U,W<U?K:Z,W,$.x,$.y)){let q=Math.abs(W-$.y)/(Z-$.x);if(r7($,J)&&(q<N||q===N&&($.x>H.x||$.x===H.x&&EN(H,$))))H=$,N=q}$=$.next}while($!==Y);return H}function EN(J,Q){return DJ(J.prev,J,Q.prev)<0&&DJ(Q.next,J,J.next)<0}function FN(J,Q,$,Z){let W=J;do{if(W.z===0)W.z=HZ(W.x,W.y,Q,$,Z);W.prevZ=W.prev,W.nextZ=W.next,W=W.next}while(W!==J);W.prevZ.nextZ=null,W.prevZ=null,DN(W)}function DN(J){let Q,$=1;do{let Z=J,W;J=null;let K=null;Q=0;while(Z){Q++;let H=Z,Y=0;for(let U=0;U<$;U++)if(Y++,H=H.nextZ,!H)break;let X=$;while(Y>0||X>0&&H){if(Y!==0&&(X===0||!H||Z.z<=H.z))W=Z,Z=Z.nextZ,Y--;else W=H,H=H.nextZ,X--;if(K)K.nextZ=W;else J=W;W.prevZ=K,K=W}Z=H}K.nextZ=null,$*=2}while(Q>1);return J}function HZ(J,Q,$,Z,W){return J=(J-$)*W|0,Q=(Q-Z)*W|0,J=(J|J<<8)&16711935,J=(J|J<<4)&252645135,J=(J|J<<2)&858993459,J=(J|J<<1)&1431655765,Q=(Q|Q<<8)&16711935,Q=(Q|Q<<4)&252645135,Q=(Q|Q<<2)&858993459,Q=(Q|Q<<1)&1431655765,J|Q<<1}function ON(J){let Q=J,$=J;do{if(Q.x<$.x||Q.x===$.x&&Q.y<$.y)$=Q;Q=Q.next}while(Q!==J);return $}function WX(J,Q,$,Z,W,K,H,Y){return(W-H)*(Q-Y)>=(J-H)*(K-Y)&&(J-H)*(Z-Y)>=($-H)*(Q-Y)&&($-H)*(K-Y)>=(W-H)*(Z-Y)}function l7(J,Q,$,Z,W,K,H,Y){return!(J===H&&Q===Y)&&WX(J,Q,$,Z,W,K,H,Y)}function RN(J,Q){return J.next.i!==Q.i&&J.prev.i!==Q.i&&!kN(J,Q)&&(r7(J,Q)&&r7(Q,J)&&MN(J,Q)&&(DJ(J.prev,J,Q.prev)||DJ(J,Q.prev,Q))||F7(J,Q)&&DJ(J.prev,J,J.next)>0&&DJ(Q.prev,Q,Q.next)>0)}function DJ(J,Q,$){return(Q.y-J.y)*($.x-Q.x)-(Q.x-J.x)*($.y-Q.y)}function F7(J,Q){return J.x===Q.x&&J.y===Q.y}function KX(J,Q,$,Z){let W=WQ(DJ(J,Q,$)),K=WQ(DJ(J,Q,Z)),H=WQ(DJ($,Z,J)),Y=WQ(DJ($,Z,Q));if(W!==K&&H!==Y)return!0;if(W===0&&ZQ(J,$,Q))return!0;if(K===0&&ZQ(J,Z,Q))return!0;if(H===0&&ZQ($,J,Z))return!0;if(Y===0&&ZQ($,Q,Z))return!0;return!1}function ZQ(J,Q,$){return Q.x<=Math.max(J.x,$.x)&&Q.x>=Math.min(J.x,$.x)&&Q.y<=Math.max(J.y,$.y)&&Q.y>=Math.min(J.y,$.y)}function WQ(J){return J>0?1:J<0?-1:0}function kN(J,Q){let $=J;do{if($.i!==J.i&&$.next.i!==J.i&&$.i!==Q.i&&$.next.i!==Q.i&&KX($,$.next,J,Q))return!0;$=$.next}while($!==J);return!1}function r7(J,Q){return DJ(J.prev,J,J.next)<0?DJ(J,Q,J.next)>=0&&DJ(J,J.prev,Q)>=0:DJ(J,Q,J.prev)<0||DJ(J,J.next,Q)<0}function MN(J,Q){let $=J,Z=!1,W=(J.x+Q.x)/2,K=(J.y+Q.y)/2;do{if($.y>K!==$.next.y>K&&$.next.y!==$.y&&W<($.next.x-$.x)*(K-$.y)/($.next.y-$.y)+$.x)Z=!Z;$=$.next}while($!==J);return Z}function HX(J,Q){let $=YZ(J.i,J.x,J.y),Z=YZ(Q.i,Q.x,Q.y),W=J.next,K=Q.prev;return J.next=Q,Q.prev=J,$.next=W,W.prev=$,Z.next=$,$.prev=Z,K.next=Z,Z.prev=K,Z}function NH(J,Q,$,Z){let W=YZ(J,Q,$);if(!Z)W.prev=W,W.next=W;else W.next=Z.next,W.prev=Z,Z.next.prev=W,Z.next=W;return W}function t7(J){if(J.next.prev=J.prev,J.prev.next=J.next,J.prevZ)J.prevZ.nextZ=J.nextZ;if(J.nextZ)J.nextZ.prevZ=J.prevZ}function YZ(J,Q,$){return{i:J,x:Q,y:$,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function LN(J,Q,$,Z){let W=0;for(let K=Q,H=$-Z;K<$;K+=Z)W+=(J[H]-J[K])*(J[K+1]+J[H+1]),H=K;return W}class YX{static triangulate(J,Q,$=2){return WN(J,Q,$)}}class N9{static area(J){let Q=J.length,$=0;for(let Z=Q-1,W=0;W<Q;Z=W++)$+=J[Z].x*J[W].y-J[W].x*J[Z].y;return $*0.5}static isClockWise(J){return N9.area(J)<0}static triangulateShape(J,Q){let $=[],Z=[],W=[];qH(J),EH($,J);let K=J.length;Q.forEach(qH);for(let Y=0;Y<Q.length;Y++)Z.push(K),K+=Q[Y].length,EH($,Q[Y]);let H=YX.triangulate($,Z);for(let Y=0;Y<H.length;Y+=3)W.push(H.slice(Y,Y+3));return W}}function qH(J){let Q=J.length;if(Q>2&&J[Q-1].equals(J[0]))J.pop()}function EH(J,Q){for(let $=0;$<Q.length;$++)J.push(Q[$].x),J.push(Q[$].y)}class sQ extends u0{constructor(J=new e9([new s(0.5,0.5),new s(-0.5,0.5),new s(-0.5,-0.5),new s(0.5,-0.5)]),Q={}){super();this.type="ExtrudeGeometry",this.parameters={shapes:J,options:Q},J=Array.isArray(J)?J:[J];let $=this,Z=[],W=[];for(let H=0,Y=J.length;H<Y;H++){let X=J[H];K(X)}this.setAttribute("position",new B0(Z,3)),this.setAttribute("uv",new B0(W,2)),this.computeVertexNormals();function K(H){let Y=[],X=Q.curveSegments!==void 0?Q.curveSegments:12,U=Q.steps!==void 0?Q.steps:1,N=Q.depth!==void 0?Q.depth:1,q=Q.bevelEnabled!==void 0?Q.bevelEnabled:!0,G=Q.bevelThickness!==void 0?Q.bevelThickness:0.2,E=Q.bevelSize!==void 0?Q.bevelSize:G-0.1,O=Q.bevelOffset!==void 0?Q.bevelOffset:0,R=Q.bevelSegments!==void 0?Q.bevelSegments:3,D=Q.extrudePath,F=Q.UVGenerator!==void 0?Q.UVGenerator:VN,M,L=!1,B,P,C,w;if(D){M=D.getSpacedPoints(U),L=!0,q=!1;let r=D.isCatmullRomCurve3?D.closed:!1;B=D.computeFrenetFrames(U,r),P=new _,C=new _,w=new _}if(!q)R=0,G=0,E=0,O=0;let k=H.extractPoints(X),A=k.shape,h=k.holes;if(!N9.isClockWise(A)){A=A.reverse();for(let r=0,Z0=h.length;r<Z0;r++){let e=h[r];if(N9.isClockWise(e))h[r]=e.reverse()}}function v(r){let O0=r[0];for(let T=1;T<=r.length;T++){let h0=T%r.length,N0=r[h0],x0=N0.x-O0.x,H0=N0.y-O0.y,d0=x0*x0+H0*H0,I=Math.max(Math.abs(N0.x),Math.abs(N0.y),Math.abs(O0.x),Math.abs(O0.y)),V=0.000000000000000000010000000000000001*I*I;if(d0<=V){r.splice(h0,1),T--;continue}O0=N0}}v(A),h.forEach(v);let l=h.length,f=A;for(let r=0;r<l;r++){let Z0=h[r];A=A.concat(Z0)}function c(r,Z0,e){if(!Z0)j0("ExtrudeGeometry: vec does not exist");return r.clone().addScaledVector(Z0,e)}let x=A.length;function m(r,Z0,e){let O0,T,h0,N0=r.x-Z0.x,x0=r.y-Z0.y,H0=e.x-r.x,d0=e.y-r.y,I=N0*N0+x0*x0,V=N0*d0-x0*H0;if(Math.abs(V)>Number.EPSILON){let b=Math.sqrt(I),n=Math.sqrt(H0*H0+d0*d0),t=Z0.x-x0/b,u=Z0.y+N0/b,z0=e.x-d0/n,F0=e.y+H0/n,S0=((z0-t)*d0-(F0-u)*H0)/(N0*d0-x0*H0);O0=t+N0*S0-r.x,T=u+x0*S0-r.y;let v0=O0*O0+T*T;if(v0<=2)return new s(O0,T);else h0=Math.sqrt(v0/2)}else{let b=!1;if(N0>Number.EPSILON){if(H0>Number.EPSILON)b=!0}else if(N0<-Number.EPSILON){if(H0<-Number.EPSILON)b=!0}else if(Math.sign(x0)===Math.sign(d0))b=!0;if(b)O0=-x0,T=N0,h0=Math.sqrt(I);else O0=N0,T=x0,h0=Math.sqrt(I/2)}return new s(O0/h0,T/h0)}let Q0=[];for(let r=0,Z0=f.length,e=Z0-1,O0=r+1;r<Z0;r++,e++,O0++){if(e===Z0)e=0;if(O0===Z0)O0=0;Q0[r]=m(f[r],f[e],f[O0])}let $0=[],U0,_0=Q0.concat();for(let r=0,Z0=l;r<Z0;r++){let e=h[r];U0=[];for(let O0=0,T=e.length,h0=T-1,N0=O0+1;O0<T;O0++,h0++,N0++){if(h0===T)h0=0;if(N0===T)N0=0;U0[O0]=m(e[O0],e[h0],e[N0])}$0.push(U0),_0=_0.concat(U0)}let K0;if(R===0)K0=N9.triangulateShape(f,h);else{let r=[],Z0=[];for(let e=0;e<R;e++){let O0=e/R,T=G*Math.cos(O0*Math.PI/2),h0=E*Math.sin(O0*Math.PI/2)+O;for(let N0=0,x0=f.length;N0<x0;N0++){let H0=c(f[N0],Q0[N0],h0);if(E0(H0.x,H0.y,-T),O0===0)r.push(H0)}for(let N0=0,x0=l;N0<x0;N0++){let H0=h[N0];U0=$0[N0];let d0=[];for(let I=0,V=H0.length;I<V;I++){let b=c(H0[I],U0[I],h0);if(E0(b.x,b.y,-T),O0===0)d0.push(b)}if(O0===0)Z0.push(d0)}}K0=N9.triangulateShape(r,Z0)}let KJ=K0.length,WJ=E+O;for(let r=0;r<x;r++){let Z0=q?c(A[r],_0[r],WJ):A[r];if(!L)E0(Z0.x,Z0.y,0);else C.copy(B.normals[0]).multiplyScalar(Z0.x),P.copy(B.binormals[0]).multiplyScalar(Z0.y),w.copy(M[0]).add(C).add(P),E0(w.x,w.y,w.z)}for(let r=1;r<=U;r++)for(let Z0=0;Z0<x;Z0++){let e=q?c(A[Z0],_0[Z0],WJ):A[Z0];if(!L)E0(e.x,e.y,N/U*r);else C.copy(B.normals[r]).multiplyScalar(e.x),P.copy(B.binormals[r]).multiplyScalar(e.y),w.copy(M[r]).add(C).add(P),E0(w.x,w.y,w.z)}for(let r=R-1;r>=0;r--){let Z0=r/R,e=G*Math.cos(Z0*Math.PI/2),O0=E*Math.sin(Z0*Math.PI/2)+O;for(let T=0,h0=f.length;T<h0;T++){let N0=c(f[T],Q0[T],O0);E0(N0.x,N0.y,N+e)}for(let T=0,h0=h.length;T<h0;T++){let N0=h[T];U0=$0[T];for(let x0=0,H0=N0.length;x0<H0;x0++){let d0=c(N0[x0],U0[x0],O0);if(!L)E0(d0.x,d0.y,N+e);else E0(d0.x,d0.y+M[U-1].y,M[U-1].x+e)}}}i(),G0();function i(){let r=Z.length/3;if(q){let Z0=0,e=x*Z0;for(let O0=0;O0<KJ;O0++){let T=K0[O0];b0(T[2]+e,T[1]+e,T[0]+e)}Z0=U+R*2,e=x*Z0;for(let O0=0;O0<KJ;O0++){let T=K0[O0];b0(T[0]+e,T[1]+e,T[2]+e)}}else{for(let Z0=0;Z0<KJ;Z0++){let e=K0[Z0];b0(e[2],e[1],e[0])}for(let Z0=0;Z0<KJ;Z0++){let e=K0[Z0];b0(e[0]+x*U,e[1]+x*U,e[2]+x*U)}}$.addGroup(r,Z.length/3-r,0)}function G0(){let r=Z.length/3,Z0=0;V0(f,Z0),Z0+=f.length;for(let e=0,O0=h.length;e<O0;e++){let T=h[e];V0(T,Z0),Z0+=T.length}$.addGroup(r,Z.length/3-r,1)}function V0(r,Z0){let e=r.length;while(--e>=0){let O0=e,T=e-1;if(T<0)T=r.length-1;for(let h0=0,N0=U+R*2;h0<N0;h0++){let x0=x*h0,H0=x*(h0+1),d0=Z0+O0+x0,I=Z0+T+x0,V=Z0+T+H0,b=Z0+O0+H0;e0(d0,I,V,b)}}}function E0(r,Z0,e){Y.push(r),Y.push(Z0),Y.push(e)}function b0(r,Z0,e){c0(r),c0(Z0),c0(e);let O0=Z.length/3,T=F.generateTopUV($,Z,O0-3,O0-2,O0-1);s0(T[0]),s0(T[1]),s0(T[2])}function e0(r,Z0,e,O0){c0(r),c0(Z0),c0(O0),c0(Z0),c0(e),c0(O0);let T=Z.length/3,h0=F.generateSideWallUV($,Z,T-6,T-3,T-2,T-1);s0(h0[0]),s0(h0[1]),s0(h0[3]),s0(h0[1]),s0(h0[2]),s0(h0[3])}function c0(r){Z.push(Y[r*3+0]),Z.push(Y[r*3+1]),Z.push(Y[r*3+2])}function s0(r){W.push(r.x),W.push(r.y)}}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}toJSON(){let J=super.toJSON(),Q=this.parameters.shapes,$=this.parameters.options;return BN(Q,$,J)}static fromJSON(J,Q){let $=[];for(let W=0,K=J.shapes.length;W<K;W++){let H=Q[J.shapes[W]];$.push(H)}let Z=J.options.extrudePath;if(Z!==void 0)J.options.extrudePath=new OQ[Z.type]().fromJSON(Z);return new sQ($,J.options)}}var VN={generateTopUV:function(J,Q,$,Z,W){let K=Q[$*3],H=Q[$*3+1],Y=Q[Z*3],X=Q[Z*3+1],U=Q[W*3],N=Q[W*3+1];return[new s(K,H),new s(Y,X),new s(U,N)]},generateSideWallUV:function(J,Q,$,Z,W,K){let H=Q[$*3],Y=Q[$*3+1],X=Q[$*3+2],U=Q[Z*3],N=Q[Z*3+1],q=Q[Z*3+2],G=Q[W*3],E=Q[W*3+1],O=Q[W*3+2],R=Q[K*3],D=Q[K*3+1],F=Q[K*3+2];if(Math.abs(Y-N)<Math.abs(H-U))return[new s(H,1-X),new s(U,1-q),new s(G,1-O),new s(R,1-F)];else return[new s(Y,1-X),new s(N,1-q),new s(E,1-O),new s(D,1-F)]}};function BN(J,Q,$){if($.shapes=[],Array.isArray(J))for(let Z=0,W=J.length;Z<W;Z++){let K=J[Z];$.shapes.push(K.uuid)}else $.shapes.push(J.uuid);if($.options=Object.assign({},Q),Q.extrudePath!==void 0)$.options.extrudePath=Q.extrudePath.toJSON();return $}class iQ extends K8{constructor(J=1,Q=0){let $=(1+Math.sqrt(5))/2,Z=[-1,$,0,1,$,0,-1,-$,0,1,-$,0,0,-1,$,0,1,$,0,-1,-$,0,1,-$,$,0,-1,$,0,1,-$,0,-1,-$,0,1],W=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(Z,W,J,Q);this.type="IcosahedronGeometry",this.parameters={radius:J,detail:Q}}static fromJSON(J){return new iQ(J.radius,J.detail)}}class oQ extends u0{constructor(J=[new s(0,-0.5),new s(0.5,0),new s(0,0.5)],Q=12,$=0,Z=Math.PI*2){super();this.type="LatheGeometry",this.parameters={points:J,segments:Q,phiStart:$,phiLength:Z},Q=Math.floor(Q),Z=p0(Z,0,Math.PI*2);let W=[],K=[],H=[],Y=[],X=[],U=1/Q,N=new _,q=new s,G=new _,E=new _,O=new _,R=0,D=0;for(let F=0;F<=J.length-1;F++)switch(F){case 0:R=J[F+1].x-J[F].x,D=J[F+1].y-J[F].y,G.x=D*1,G.y=-R,G.z=D*0,O.copy(G),G.normalize(),Y.push(G.x,G.y,G.z);break;case J.length-1:Y.push(O.x,O.y,O.z);break;default:R=J[F+1].x-J[F].x,D=J[F+1].y-J[F].y,G.x=D*1,G.y=-R,G.z=D*0,E.copy(G),G.x+=O.x,G.y+=O.y,G.z+=O.z,G.normalize(),Y.push(G.x,G.y,G.z),O.copy(E)}for(let F=0;F<=Q;F++){let M=$+F*U*Z,L=Math.sin(M),B=Math.cos(M);for(let P=0;P<=J.length-1;P++){N.x=J[P].x*L,N.y=J[P].y,N.z=J[P].x*B,K.push(N.x,N.y,N.z),q.x=F/Q,q.y=P/(J.length-1),H.push(q.x,q.y);let C=Y[3*P+0]*L,w=Y[3*P+1],k=Y[3*P+0]*B;X.push(C,w,k)}}for(let F=0;F<Q;F++)for(let M=0;M<J.length-1;M++){let L=M+F*J.length,B=L,P=L+J.length,C=L+J.length+1,w=L+1;W.push(B,P,w),W.push(C,w,P)}this.setIndex(W),this.setAttribute("position",new B0(K,3)),this.setAttribute("uv",new B0(H,2)),this.setAttribute("normal",new B0(X,3))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new oQ(J.points,J.segments,J.phiStart,J.phiLength)}}class F6 extends K8{constructor(J=1,Q=0){let $=[1,0,0,-1,0,0,0,1,0,0,-1,0,0,0,1,0,0,-1],Z=[0,2,4,0,4,3,0,3,5,0,5,2,1,2,5,1,5,3,1,3,4,1,4,2];super($,Z,J,Q);this.type="OctahedronGeometry",this.parameters={radius:J,detail:Q}}static fromJSON(J){return new F6(J.radius,J.detail)}}class w7 extends u0{constructor(J=1,Q=1,$=1,Z=1){super();this.type="PlaneGeometry",this.parameters={width:J,height:Q,widthSegments:$,heightSegments:Z};let W=J/2,K=Q/2,H=Math.floor($),Y=Math.floor(Z),X=H+1,U=Y+1,N=J/H,q=Q/Y,G=[],E=[],O=[],R=[];for(let D=0;D<U;D++){let F=D*q-K;for(let M=0;M<X;M++){let L=M*N-W;E.push(L,-F,0),O.push(0,0,1),R.push(M/H),R.push(1-D/Y)}}for(let D=0;D<Y;D++)for(let F=0;F<H;F++){let M=F+X*D,L=F+X*(D+1),B=F+1+X*(D+1),P=F+1+X*D;G.push(M,L,P),G.push(L,B,P)}this.setIndex(G),this.setAttribute("position",new B0(E,3)),this.setAttribute("normal",new B0(O,3)),this.setAttribute("uv",new B0(R,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new w7(J.width,J.height,J.widthSegments,J.heightSegments)}}class aQ extends u0{constructor(J=0.5,Q=1,$=32,Z=1,W=0,K=Math.PI*2){super();this.type="RingGeometry",this.parameters={innerRadius:J,outerRadius:Q,thetaSegments:$,phiSegments:Z,thetaStart:W,thetaLength:K},$=Math.max(3,$),Z=Math.max(1,Z);let H=[],Y=[],X=[],U=[],N=J,q=(Q-J)/Z,G=new _,E=new s;for(let O=0;O<=Z;O++){for(let R=0;R<=$;R++){let D=W+R/$*K;G.x=N*Math.cos(D),G.y=N*Math.sin(D),Y.push(G.x,G.y,G.z),X.push(0,0,1),E.x=(G.x/Q+1)/2,E.y=(G.y/Q+1)/2,U.push(E.x,E.y)}N+=q}for(let O=0;O<Z;O++){let R=O*($+1);for(let D=0;D<$;D++){let F=D+R,M=F,L=F+$+1,B=F+$+2,P=F+1;H.push(M,L,P),H.push(L,B,P)}}this.setIndex(H),this.setAttribute("position",new B0(Y,3)),this.setAttribute("normal",new B0(X,3)),this.setAttribute("uv",new B0(U,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new aQ(J.innerRadius,J.outerRadius,J.thetaSegments,J.phiSegments,J.thetaStart,J.thetaLength)}}class rQ extends u0{constructor(J=new e9([new s(0,0.5),new s(-0.5,-0.5),new s(0.5,-0.5)]),Q=12){super();this.type="ShapeGeometry",this.parameters={shapes:J,curveSegments:Q};let $=[],Z=[],W=[],K=[],H=0,Y=0;if(Array.isArray(J)===!1)X(J);else for(let U=0;U<J.length;U++)X(J[U]),this.addGroup(H,Y,U),H+=Y,Y=0;this.setIndex($),this.setAttribute("position",new B0(Z,3)),this.setAttribute("normal",new B0(W,3)),this.setAttribute("uv",new B0(K,2));function X(U){let N=Z.length/3,q=U.extractPoints(Q),G=q.shape,E=q.holes;if(N9.isClockWise(G)===!1)G=G.reverse();for(let R=0,D=E.length;R<D;R++){let F=E[R];if(N9.isClockWise(F)===!0)E[R]=F.reverse()}let O=N9.triangulateShape(G,E);for(let R=0,D=E.length;R<D;R++){let F=E[R];G=G.concat(F)}for(let R=0,D=G.length;R<D;R++){let F=G[R];Z.push(F.x,F.y,0),W.push(0,0,1),K.push(F.x,F.y)}for(let R=0,D=O.length;R<D;R++){let F=O[R],M=F[0]+N,L=F[1]+N,B=F[2]+N;$.push(M,L,B),Y+=3}}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}toJSON(){let J=super.toJSON(),Q=this.parameters.shapes;return zN(Q,J)}static fromJSON(J,Q){let $=[];for(let Z=0,W=J.shapes.length;Z<W;Z++){let K=Q[J.shapes[Z]];$.push(K)}return new rQ($,J.curveSegments)}}function zN(J,Q){if(Q.shapes=[],Array.isArray(J))for(let $=0,Z=J.length;$<Z;$++){let W=J[$];Q.shapes.push(W.uuid)}else Q.shapes.push(J.uuid);return Q}class D6 extends u0{constructor(J=1,Q=32,$=16,Z=0,W=Math.PI*2,K=0,H=Math.PI){super();this.type="SphereGeometry",this.parameters={radius:J,widthSegments:Q,heightSegments:$,phiStart:Z,phiLength:W,thetaStart:K,thetaLength:H},Q=Math.max(3,Math.floor(Q)),$=Math.max(2,Math.floor($));let Y=Math.min(K+H,Math.PI),X=0,U=[],N=new _,q=new _,G=[],E=[],O=[],R=[];for(let D=0;D<=$;D++){let F=[],M=D/$,L=0;if(D===0&&K===0)L=0.5/Q;else if(D===$&&Y===Math.PI)L=-0.5/Q;for(let B=0;B<=Q;B++){let P=B/Q;N.x=-J*Math.cos(Z+P*W)*Math.sin(K+M*H),N.y=J*Math.cos(K+M*H),N.z=J*Math.sin(Z+P*W)*Math.sin(K+M*H),E.push(N.x,N.y,N.z),q.copy(N).normalize(),O.push(q.x,q.y,q.z),R.push(P+L,1-M),F.push(X++)}U.push(F)}for(let D=0;D<$;D++)for(let F=0;F<Q;F++){let M=U[D][F+1],L=U[D][F],B=U[D+1][F],P=U[D+1][F+1];if(D!==0||K>0)G.push(M,L,P);if(D!==$-1||Y<Math.PI)G.push(L,B,P)}this.setIndex(G),this.setAttribute("position",new B0(E,3)),this.setAttribute("normal",new B0(O,3)),this.setAttribute("uv",new B0(R,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new D6(J.radius,J.widthSegments,J.heightSegments,J.phiStart,J.phiLength,J.thetaStart,J.thetaLength)}}class tQ extends K8{constructor(J=1,Q=0){let $=[1,1,1,-1,-1,1,-1,1,-1,1,-1,-1],Z=[2,1,0,0,3,2,1,3,0,2,3,1];super($,Z,J,Q);this.type="TetrahedronGeometry",this.parameters={radius:J,detail:Q}}static fromJSON(J){return new tQ(J.radius,J.detail)}}class eQ extends u0{constructor(J=1,Q=0.4,$=12,Z=48,W=Math.PI*2,K=0,H=Math.PI*2){super();this.type="TorusGeometry",this.parameters={radius:J,tube:Q,radialSegments:$,tubularSegments:Z,arc:W,thetaStart:K,thetaLength:H},$=Math.floor($),Z=Math.floor(Z);let Y=[],X=[],U=[],N=[],q=new _,G=new _,E=new _;for(let O=0;O<=$;O++){let R=K+O/$*H;for(let D=0;D<=Z;D++){let F=D/Z*W;G.x=(J+Q*Math.cos(R))*Math.cos(F),G.y=(J+Q*Math.cos(R))*Math.sin(F),G.z=Q*Math.sin(R),X.push(G.x,G.y,G.z),q.x=J*Math.cos(F),q.y=J*Math.sin(F),E.subVectors(G,q).normalize(),U.push(E.x,E.y,E.z),N.push(D/Z),N.push(O/$)}}for(let O=1;O<=$;O++)for(let R=1;R<=Z;R++){let D=(Z+1)*O+R-1,F=(Z+1)*(O-1)+R-1,M=(Z+1)*(O-1)+R,L=(Z+1)*O+R;Y.push(D,F,L),Y.push(F,M,L)}this.setIndex(Y),this.setAttribute("position",new B0(X,3)),this.setAttribute("normal",new B0(U,3)),this.setAttribute("uv",new B0(N,2))}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new eQ(J.radius,J.tube,J.radialSegments,J.tubularSegments,J.arc)}}class J$ extends u0{constructor(J=1,Q=0.4,$=64,Z=8,W=2,K=3){super();this.type="TorusKnotGeometry",this.parameters={radius:J,tube:Q,tubularSegments:$,radialSegments:Z,p:W,q:K},$=Math.floor($),Z=Math.floor(Z);let H=[],Y=[],X=[],U=[],N=new _,q=new _,G=new _,E=new _,O=new _,R=new _,D=new _;for(let M=0;M<=$;++M){let L=M/$*W*Math.PI*2;F(L,W,K,J,G),F(L+0.01,W,K,J,E),R.subVectors(E,G),D.addVectors(E,G),O.crossVectors(R,D),D.crossVectors(O,R),O.normalize(),D.normalize();for(let B=0;B<=Z;++B){let P=B/Z*Math.PI*2,C=-Q*Math.cos(P),w=Q*Math.sin(P);N.x=G.x+(C*D.x+w*O.x),N.y=G.y+(C*D.y+w*O.y),N.z=G.z+(C*D.z+w*O.z),Y.push(N.x,N.y,N.z),q.subVectors(N,G).normalize(),X.push(q.x,q.y,q.z),U.push(M/$),U.push(B/Z)}}for(let M=1;M<=$;M++)for(let L=1;L<=Z;L++){let B=(Z+1)*(M-1)+(L-1),P=(Z+1)*M+(L-1),C=(Z+1)*M+L,w=(Z+1)*(M-1)+L;H.push(B,P,w),H.push(P,C,w)}this.setIndex(H),this.setAttribute("position",new B0(Y,3)),this.setAttribute("normal",new B0(X,3)),this.setAttribute("uv",new B0(U,2));function F(M,L,B,P,C){let w=Math.cos(M),k=Math.sin(M),A=B/L*M,h=Math.cos(A);C.x=P*(2+h)*0.5*w,C.y=P*(2+h)*k*0.5,C.z=P*Math.sin(A)*0.5}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}static fromJSON(J){return new J$(J.radius,J.tube,J.tubularSegments,J.radialSegments,J.p,J.q)}}class Q$ extends u0{constructor(J=new cQ(new _(-1,-1,0),new _(-1,1,0),new _(1,1,0)),Q=64,$=1,Z=8,W=!1){super();this.type="TubeGeometry",this.parameters={path:J,tubularSegments:Q,radius:$,radialSegments:Z,closed:W};let K=J.computeFrenetFrames(Q,W);this.tangents=K.tangents,this.normals=K.normals,this.binormals=K.binormals;let H=new _,Y=new _,X=new s,U=new _,N=[],q=[],G=[],E=[];O(),this.setIndex(E),this.setAttribute("position",new B0(N,3)),this.setAttribute("normal",new B0(q,3)),this.setAttribute("uv",new B0(G,2));function O(){for(let M=0;M<Q;M++)R(M);R(W===!1?Q:0),F(),D()}function R(M){U=J.getPointAt(M/Q,U);let L=K.normals[M],B=K.binormals[M];for(let P=0;P<=Z;P++){let C=P/Z*Math.PI*2,w=Math.sin(C),k=-Math.cos(C);Y.x=k*L.x+w*B.x,Y.y=k*L.y+w*B.y,Y.z=k*L.z+w*B.z,Y.normalize(),q.push(Y.x,Y.y,Y.z),H.x=U.x+$*Y.x,H.y=U.y+$*Y.y,H.z=U.z+$*Y.z,N.push(H.x,H.y,H.z)}}function D(){for(let M=1;M<=Q;M++)for(let L=1;L<=Z;L++){let B=(Z+1)*(M-1)+(L-1),P=(Z+1)*M+(L-1),C=(Z+1)*M+L,w=(Z+1)*(M-1)+L;E.push(B,P,w),E.push(P,C,w)}}function F(){for(let M=0;M<=Q;M++)for(let L=0;L<=Z;L++)X.x=M/Q,X.y=L/Z,G.push(X.x,X.y)}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}toJSON(){let J=super.toJSON();return J.path=this.parameters.path.toJSON(),J}static fromJSON(J){return new Q$(new OQ[J.path.type]().fromJSON(J.path),J.tubularSegments,J.radius,J.radialSegments,J.closed)}}class PW extends u0{constructor(J=null){super();if(this.type="WireframeGeometry",this.parameters={geometry:J},J!==null){let Q=[],$=new Set,Z=new _,W=new _;if(J.index!==null){let K=J.attributes.position,H=J.index,Y=J.groups;if(Y.length===0)Y=[{start:0,count:H.count,materialIndex:0}];for(let X=0,U=Y.length;X<U;++X){let N=Y[X],q=N.start,G=N.count;for(let E=q,O=q+G;E<O;E+=3)for(let R=0;R<3;R++){let D=H.getX(E+R),F=H.getX(E+(R+1)%3);if(Z.fromBufferAttribute(K,D),W.fromBufferAttribute(K,F),FH(Z,W,$)===!0)Q.push(Z.x,Z.y,Z.z),Q.push(W.x,W.y,W.z)}}}else{let K=J.attributes.position;for(let H=0,Y=K.count/3;H<Y;H++)for(let X=0;X<3;X++){let U=3*H+X,N=3*H+(X+1)%3;if(Z.fromBufferAttribute(K,U),W.fromBufferAttribute(K,N),FH(Z,W,$)===!0)Q.push(Z.x,Z.y,Z.z),Q.push(W.x,W.y,W.z)}}this.setAttribute("position",new B0(Q,3))}}copy(J){return super.copy(J),this.parameters=Object.assign({},J.parameters),this}}function FH(J,Q,$){let Z=`${J.x},${J.y},${J.z}-${Q.x},${Q.y},${Q.z}`,W=`${Q.x},${Q.y},${Q.z}-${J.x},${J.y},${J.z}`;if($.has(Z)===!0||$.has(W)===!0)return!1;else return $.add(Z),$.add(W),!0}var DH=Object.freeze({__proto__:null,BoxGeometry:h8,CapsuleGeometry:gQ,CircleGeometry:pQ,ConeGeometry:q6,CylinderGeometry:N6,DodecahedronGeometry:mQ,EdgesGeometry:BW,ExtrudeGeometry:sQ,IcosahedronGeometry:iQ,LatheGeometry:oQ,OctahedronGeometry:F6,PlaneGeometry:w7,PolyhedronGeometry:K8,RingGeometry:aQ,ShapeGeometry:rQ,SphereGeometry:D6,TetrahedronGeometry:tQ,TorusGeometry:eQ,TorusKnotGeometry:J$,TubeGeometry:Q$,WireframeGeometry:PW});class TW extends yJ{constructor(J){super();this.isShadowMaterial=!0,this.type="ShadowMaterial",this.color=new M0(0),this.transparent=!0,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.fog=J.fog,this}}function x8(J){let Q={};for(let $ in J){Q[$]={};for(let Z in J[$]){let W=J[$][Z];if(W&&(W.isColor||W.isMatrix3||W.isMatrix4||W.isVector2||W.isVector3||W.isVector4||W.isTexture||W.isQuaternion))if(W.isRenderTargetTexture)q0("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),Q[$][Z]=null;else Q[$][Z]=W.clone();else if(Array.isArray(W))Q[$][Z]=W.slice();else Q[$][Z]=W}}return Q}function gJ(J){let Q={};for(let $=0;$<J.length;$++){let Z=x8(J[$]);for(let W in Z)Q[W]=Z[W]}return Q}function IN(J){let Q=[];for(let $=0;$<J.length;$++)Q.push(J[$].clone());return Q}function SW(J){let Q=J.getRenderTarget();if(Q===null)return J.outputColorSpace;if(Q.isXRRenderTarget===!0)return Q.texture.colorSpace;return JJ.workingColorSpace}var XX={clone:x8,merge:gJ},CN=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,wN=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Q9 extends yJ{constructor(J){super();if(this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=CN,this.fragmentShader=wN,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,J!==void 0)this.setValues(J)}copy(J){return super.copy(J),this.fragmentShader=J.fragmentShader,this.vertexShader=J.vertexShader,this.uniforms=x8(J.uniforms),this.uniformsGroups=IN(J.uniformsGroups),this.defines=Object.assign({},J.defines),this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.fog=J.fog,this.lights=J.lights,this.clipping=J.clipping,this.extensions=Object.assign({},J.extensions),this.glslVersion=J.glslVersion,this.defaultAttributeValues=Object.assign({},J.defaultAttributeValues),this.index0AttributeName=J.index0AttributeName,this.uniformsNeedUpdate=J.uniformsNeedUpdate,this}toJSON(J){let Q=super.toJSON(J);Q.glslVersion=this.glslVersion,Q.uniforms={};for(let Z in this.uniforms){let K=this.uniforms[Z].value;if(K&&K.isTexture)Q.uniforms[Z]={type:"t",value:K.toJSON(J).uuid};else if(K&&K.isColor)Q.uniforms[Z]={type:"c",value:K.getHex()};else if(K&&K.isVector2)Q.uniforms[Z]={type:"v2",value:K.toArray()};else if(K&&K.isVector3)Q.uniforms[Z]={type:"v3",value:K.toArray()};else if(K&&K.isVector4)Q.uniforms[Z]={type:"v4",value:K.toArray()};else if(K&&K.isMatrix3)Q.uniforms[Z]={type:"m3",value:K.toArray()};else if(K&&K.isMatrix4)Q.uniforms[Z]={type:"m4",value:K.toArray()};else Q.uniforms[Z]={value:K}}if(Object.keys(this.defines).length>0)Q.defines=this.defines;Q.vertexShader=this.vertexShader,Q.fragmentShader=this.fragmentShader,Q.lights=this.lights,Q.clipping=this.clipping;let $={};for(let Z in this.extensions)if(this.extensions[Z]===!0)$[Z]=!0;if(Object.keys($).length>0)Q.extensions=$;return Q}}class $$ extends Q9{constructor(J){super(J);this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}}class Z$ extends yJ{constructor(J){super();this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new M0(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new M0(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new s(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new J9,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.defines={STANDARD:""},this.color.copy(J.color),this.roughness=J.roughness,this.metalness=J.metalness,this.map=J.map,this.lightMap=J.lightMap,this.lightMapIntensity=J.lightMapIntensity,this.aoMap=J.aoMap,this.aoMapIntensity=J.aoMapIntensity,this.emissive.copy(J.emissive),this.emissiveMap=J.emissiveMap,this.emissiveIntensity=J.emissiveIntensity,this.bumpMap=J.bumpMap,this.bumpScale=J.bumpScale,this.normalMap=J.normalMap,this.normalMapType=J.normalMapType,this.normalScale.copy(J.normalScale),this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.roughnessMap=J.roughnessMap,this.metalnessMap=J.metalnessMap,this.alphaMap=J.alphaMap,this.envMap=J.envMap,this.envMapRotation.copy(J.envMapRotation),this.envMapIntensity=J.envMapIntensity,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.wireframeLinecap=J.wireframeLinecap,this.wireframeLinejoin=J.wireframeLinejoin,this.flatShading=J.flatShading,this.fog=J.fog,this}}class jW extends Z${constructor(J){super();this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new s(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return p0(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(Q){this.ior=(1+0.4*Q)/(1-0.4*Q)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new M0(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new M0(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new M0(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._dispersion=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(J)}get anisotropy(){return this._anisotropy}set anisotropy(J){if(this._anisotropy>0!==J>0)this.version++;this._anisotropy=J}get clearcoat(){return this._clearcoat}set clearcoat(J){if(this._clearcoat>0!==J>0)this.version++;this._clearcoat=J}get iridescence(){return this._iridescence}set iridescence(J){if(this._iridescence>0!==J>0)this.version++;this._iridescence=J}get dispersion(){return this._dispersion}set dispersion(J){if(this._dispersion>0!==J>0)this.version++;this._dispersion=J}get sheen(){return this._sheen}set sheen(J){if(this._sheen>0!==J>0)this.version++;this._sheen=J}get transmission(){return this._transmission}set transmission(J){if(this._transmission>0!==J>0)this.version++;this._transmission=J}copy(J){return super.copy(J),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=J.anisotropy,this.anisotropyRotation=J.anisotropyRotation,this.anisotropyMap=J.anisotropyMap,this.clearcoat=J.clearcoat,this.clearcoatMap=J.clearcoatMap,this.clearcoatRoughness=J.clearcoatRoughness,this.clearcoatRoughnessMap=J.clearcoatRoughnessMap,this.clearcoatNormalMap=J.clearcoatNormalMap,this.clearcoatNormalScale.copy(J.clearcoatNormalScale),this.dispersion=J.dispersion,this.ior=J.ior,this.iridescence=J.iridescence,this.iridescenceMap=J.iridescenceMap,this.iridescenceIOR=J.iridescenceIOR,this.iridescenceThicknessRange=[...J.iridescenceThicknessRange],this.iridescenceThicknessMap=J.iridescenceThicknessMap,this.sheen=J.sheen,this.sheenColor.copy(J.sheenColor),this.sheenColorMap=J.sheenColorMap,this.sheenRoughness=J.sheenRoughness,this.sheenRoughnessMap=J.sheenRoughnessMap,this.transmission=J.transmission,this.transmissionMap=J.transmissionMap,this.thickness=J.thickness,this.thicknessMap=J.thicknessMap,this.attenuationDistance=J.attenuationDistance,this.attenuationColor.copy(J.attenuationColor),this.specularIntensity=J.specularIntensity,this.specularIntensityMap=J.specularIntensityMap,this.specularColor.copy(J.specularColor),this.specularColorMap=J.specularColorMap,this}}class yW extends yJ{constructor(J){super();this.isMeshPhongMaterial=!0,this.type="MeshPhongMaterial",this.color=new M0(16777215),this.specular=new M0(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new M0(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new s(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new J9,this.combine=0,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=0.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.specular.copy(J.specular),this.shininess=J.shininess,this.map=J.map,this.lightMap=J.lightMap,this.lightMapIntensity=J.lightMapIntensity,this.aoMap=J.aoMap,this.aoMapIntensity=J.aoMapIntensity,this.emissive.copy(J.emissive),this.emissiveMap=J.emissiveMap,this.emissiveIntensity=J.emissiveIntensity,this.bumpMap=J.bumpMap,this.bumpScale=J.bumpScale,this.normalMap=J.normalMap,this.normalMapType=J.normalMapType,this.normalScale.copy(J.normalScale),this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.specularMap=J.specularMap,this.alphaMap=J.alphaMap,this.envMap=J.envMap,this.envMapRotation.copy(J.envMapRotation),this.combine=J.combine,this.reflectivity=J.reflectivity,this.envMapIntensity=J.envMapIntensity,this.refractionRatio=J.refractionRatio,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.wireframeLinecap=J.wireframeLinecap,this.wireframeLinejoin=J.wireframeLinejoin,this.flatShading=J.flatShading,this.fog=J.fog,this}}class fW extends yJ{constructor(J){super();this.isMeshToonMaterial=!0,this.defines={TOON:""},this.type="MeshToonMaterial",this.color=new M0(16777215),this.map=null,this.gradientMap=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new M0(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new s(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.alphaMap=null,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.gradientMap=J.gradientMap,this.lightMap=J.lightMap,this.lightMapIntensity=J.lightMapIntensity,this.aoMap=J.aoMap,this.aoMapIntensity=J.aoMapIntensity,this.emissive.copy(J.emissive),this.emissiveMap=J.emissiveMap,this.emissiveIntensity=J.emissiveIntensity,this.bumpMap=J.bumpMap,this.bumpScale=J.bumpScale,this.normalMap=J.normalMap,this.normalMapType=J.normalMapType,this.normalScale.copy(J.normalScale),this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.alphaMap=J.alphaMap,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.wireframeLinecap=J.wireframeLinecap,this.wireframeLinejoin=J.wireframeLinejoin,this.fog=J.fog,this}}class bW extends yJ{constructor(J){super();this.isMeshNormalMaterial=!0,this.type="MeshNormalMaterial",this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new s(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.flatShading=!1,this.setValues(J)}copy(J){return super.copy(J),this.bumpMap=J.bumpMap,this.bumpScale=J.bumpScale,this.normalMap=J.normalMap,this.normalMapType=J.normalMapType,this.normalScale.copy(J.normalScale),this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.flatShading=J.flatShading,this}}class vW extends yJ{constructor(J){super();this.isMeshLambertMaterial=!0,this.type="MeshLambertMaterial",this.color=new M0(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new M0(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new s(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new J9,this.combine=0,this.reflectivity=1,this.envMapIntensity=1,this.refractionRatio=0.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.color.copy(J.color),this.map=J.map,this.lightMap=J.lightMap,this.lightMapIntensity=J.lightMapIntensity,this.aoMap=J.aoMap,this.aoMapIntensity=J.aoMapIntensity,this.emissive.copy(J.emissive),this.emissiveMap=J.emissiveMap,this.emissiveIntensity=J.emissiveIntensity,this.bumpMap=J.bumpMap,this.bumpScale=J.bumpScale,this.normalMap=J.normalMap,this.normalMapType=J.normalMapType,this.normalScale.copy(J.normalScale),this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.specularMap=J.specularMap,this.alphaMap=J.alphaMap,this.envMap=J.envMap,this.envMapRotation.copy(J.envMapRotation),this.combine=J.combine,this.reflectivity=J.reflectivity,this.envMapIntensity=J.envMapIntensity,this.refractionRatio=J.refractionRatio,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.wireframeLinecap=J.wireframeLinecap,this.wireframeLinejoin=J.wireframeLinejoin,this.flatShading=J.flatShading,this.fog=J.fog,this}}class W$ extends yJ{constructor(J){super();this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=3200,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(J)}copy(J){return super.copy(J),this.depthPacking=J.depthPacking,this.map=J.map,this.alphaMap=J.alphaMap,this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this}}class K$ extends yJ{constructor(J){super();this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(J)}copy(J){return super.copy(J),this.map=J.map,this.alphaMap=J.alphaMap,this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this}}class hW extends yJ{constructor(J){super();this.isMeshMatcapMaterial=!0,this.defines={MATCAP:""},this.type="MeshMatcapMaterial",this.color=new M0(16777215),this.matcap=null,this.map=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new s(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.alphaMap=null,this.wireframe=!1,this.wireframeLinewidth=1,this.flatShading=!1,this.fog=!0,this.setValues(J)}copy(J){return super.copy(J),this.defines={MATCAP:""},this.color.copy(J.color),this.matcap=J.matcap,this.map=J.map,this.bumpMap=J.bumpMap,this.bumpScale=J.bumpScale,this.normalMap=J.normalMap,this.normalMapType=J.normalMapType,this.normalScale.copy(J.normalScale),this.displacementMap=J.displacementMap,this.displacementScale=J.displacementScale,this.displacementBias=J.displacementBias,this.alphaMap=J.alphaMap,this.wireframe=J.wireframe,this.wireframeLinewidth=J.wireframeLinewidth,this.flatShading=J.flatShading,this.fog=J.fog,this}}class xW extends xJ{constructor(J){super();this.isLineDashedMaterial=!0,this.type="LineDashedMaterial",this.scale=1,this.dashSize=3,this.gapSize=1,this.setValues(J)}copy(J){return super.copy(J),this.scale=J.scale,this.dashSize=J.dashSize,this.gapSize=J.gapSize,this}}function I8(J,Q){if(!J||J.constructor===Q)return J;if(typeof Q.BYTES_PER_ELEMENT==="number")return new Q(J);return Array.prototype.slice.call(J)}function UX(J){function Q(W,K){return J[W]-J[K]}let $=J.length,Z=Array($);for(let W=0;W!==$;++W)Z[W]=W;return Z.sort(Q),Z}function XZ(J,Q,$){let Z=J.length,W=new J.constructor(Z);for(let K=0,H=0;H!==Z;++K){let Y=$[K]*Q;for(let X=0;X!==Q;++X)W[H++]=J[Y+X]}return W}function gW(J,Q,$,Z){let W=1,K=J[0];while(K!==void 0&&K[Z]===void 0)K=J[W++];if(K===void 0)return;let H=K[Z];if(H===void 0)return;if(Array.isArray(H))do{if(H=K[Z],H!==void 0)Q.push(K.time),$.push(...H);K=J[W++]}while(K!==void 0);else if(H.toArray!==void 0)do{if(H=K[Z],H!==void 0)Q.push(K.time),H.toArray($,$.length);K=J[W++]}while(K!==void 0);else do{if(H=K[Z],H!==void 0)Q.push(K.time),$.push(H);K=J[W++]}while(K!==void 0)}function AN(J,Q,$,Z,W=30){let K=J.clone();K.name=Q;let H=[];for(let X=0;X<K.tracks.length;++X){let U=K.tracks[X],N=U.getValueSize(),q=[],G=[];for(let E=0;E<U.times.length;++E){let O=U.times[E]*W;if(O<$||O>=Z)continue;q.push(U.times[E]);for(let R=0;R<N;++R)G.push(U.values[E*N+R])}if(q.length===0)continue;U.times=I8(q,U.times.constructor),U.values=I8(G,U.values.constructor),H.push(U)}K.tracks=H;let Y=1/0;for(let X=0;X<K.tracks.length;++X)if(Y>K.tracks[X].times[0])Y=K.tracks[X].times[0];for(let X=0;X<K.tracks.length;++X)K.tracks[X].shift(-1*Y);return K.resetDuration(),K}function _N(J,Q=0,$=J,Z=30){if(Z<=0)Z=30;let W=$.tracks.length,K=Q/Z;for(let H=0;H<W;++H){let Y=$.tracks[H],X=Y.ValueTypeName;if(X==="bool"||X==="string")continue;let U=J.tracks.find(function(F){return F.name===Y.name&&F.ValueTypeName===X});if(U===void 0)continue;let N=0,q=Y.getValueSize();if(Y.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline)N=q/3;let G=0,E=U.getValueSize();if(U.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline)G=E/3;let O=Y.times.length-1,R;if(K<=Y.times[0]){let F=N,M=q-N;R=Y.values.slice(F,M)}else if(K>=Y.times[O]){let F=O*q+N,M=F+q-N;R=Y.values.slice(F,M)}else{let F=Y.createInterpolant(),M=N,L=q-N;F.evaluate(K),R=F.resultBuffer.slice(M,L)}if(X==="quaternion")new zJ().fromArray(R).normalize().conjugate().toArray(R);let D=U.times.length;for(let F=0;F<D;++F){let M=F*E+G;if(X==="quaternion")zJ.multiplyQuaternionsFlat(U.values,M,R,0,U.values,M);else{let L=E-G*2;for(let B=0;B<L;++B)U.values[M+B]-=R[B]}}}return J.blendMode=2501,J}class GX{static convertArray(J,Q){return I8(J,Q)}static isTypedArray(J){return bY(J)}static getKeyframeOrder(J){return UX(J)}static sortedArray(J,Q,$){return XZ(J,Q,$)}static flattenJSON(J,Q,$,Z){gW(J,Q,$,Z)}static subclip(J,Q,$,Z,W=30){return AN(J,Q,$,Z,W)}static makeClipAdditive(J,Q=0,$=J,Z=30){return _N(J,Q,$,Z)}}class g8{constructor(J,Q,$,Z){this.parameterPositions=J,this._cachedIndex=0,this.resultBuffer=Z!==void 0?Z:new Q.constructor($),this.sampleValues=Q,this.valueSize=$,this.settings=null,this.DefaultSettings_={}}evaluate(J){let Q=this.parameterPositions,$=this._cachedIndex,Z=Q[$],W=Q[$-1];J:{Q:{let K;$:{Z:if(!(J<Z)){for(let H=$+2;;){if(Z===void 0){if(J<W)break Z;return $=Q.length,this._cachedIndex=$,this.copySampleValue_($-1)}if($===H)break;if(W=Z,Z=Q[++$],J<Z)break Q}K=Q.length;break $}if(!(J>=W)){let H=Q[1];if(J<H)$=2,W=H;for(let Y=$-2;;){if(W===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if($===Y)break;if(Z=W,W=Q[--$-1],J>=W)break Q}K=$,$=0;break $}break J}while($<K){let H=$+K>>>1;if(J<Q[H])K=H;else $=H+1}if(Z=Q[$],W=Q[$-1],W===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(Z===void 0)return $=Q.length,this._cachedIndex=$,this.copySampleValue_($-1)}this._cachedIndex=$,this.intervalChanged_($,W,Z)}return this.interpolate_($,W,J,Z)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(J){let Q=this.resultBuffer,$=this.sampleValues,Z=this.valueSize,W=J*Z;for(let K=0;K!==Z;++K)Q[K]=$[W+K];return Q}interpolate_(){throw Error("call to abstract method")}intervalChanged_(){}}class pW extends g8{constructor(J,Q,$,Z){super(J,Q,$,Z);this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:2400,endingEnd:2400}}intervalChanged_(J,Q,$){let Z=this.parameterPositions,W=J-2,K=J+1,H=Z[W],Y=Z[K];if(H===void 0)switch(this.getSettings_().endingStart){case 2401:W=J,H=2*Q-$;break;case 2402:W=Z.length-2,H=Q+Z[W]-Z[W+1];break;default:W=J,H=$}if(Y===void 0)switch(this.getSettings_().endingEnd){case 2401:K=J,Y=2*$-Q;break;case 2402:K=1,Y=$+Z[1]-Z[0];break;default:K=J-1,Y=Q}let X=($-Q)*0.5,U=this.valueSize;this._weightPrev=X/(Q-H),this._weightNext=X/(Y-$),this._offsetPrev=W*U,this._offsetNext=K*U}interpolate_(J,Q,$,Z){let W=this.resultBuffer,K=this.sampleValues,H=this.valueSize,Y=J*H,X=Y-H,U=this._offsetPrev,N=this._offsetNext,q=this._weightPrev,G=this._weightNext,E=($-Q)/(Z-Q),O=E*E,R=O*E,D=-q*R+2*q*O-q*E,F=(1+q)*R+(-1.5-2*q)*O+(-0.5+q)*E+1,M=(-1-G)*R+(1.5+G)*O+0.5*E,L=G*R-G*O;for(let B=0;B!==H;++B)W[B]=D*K[U+B]+F*K[X+B]+M*K[Y+B]+L*K[N+B];return W}}class H$ extends g8{constructor(J,Q,$,Z){super(J,Q,$,Z)}interpolate_(J,Q,$,Z){let W=this.resultBuffer,K=this.sampleValues,H=this.valueSize,Y=J*H,X=Y-H,U=($-Q)/(Z-Q),N=1-U;for(let q=0;q!==H;++q)W[q]=K[X+q]*N+K[Y+q]*U;return W}}class mW extends g8{constructor(J,Q,$,Z){super(J,Q,$,Z)}interpolate_(J){return this.copySampleValue_(J-1)}}class dW extends g8{interpolate_(J,Q,$,Z){let W=this.resultBuffer,K=this.sampleValues,H=this.valueSize,Y=J*H,X=Y-H,U=this.settings||this.DefaultSettings_,N=U.inTangents,q=U.outTangents;if(!N||!q){let O=($-Q)/(Z-Q),R=1-O;for(let D=0;D!==H;++D)W[D]=K[X+D]*R+K[Y+D]*O;return W}let G=H*2,E=J-1;for(let O=0;O!==H;++O){let R=K[X+O],D=K[Y+O],F=E*G+O*2,M=q[F],L=q[F+1],B=J*G+O*2,P=N[B],C=N[B+1],w=($-Q)/(Z-Q),k,A,h,S,v;for(let l=0;l<8;l++){k=w*w,A=k*w,h=1-w,S=h*h,v=S*h;let c=v*Q+3*S*w*M+3*h*k*P+A*Z-$;if(Math.abs(c)<0.0000000001)break;let x=3*S*(M-Q)+6*h*w*(P-M)+3*k*(Z-P);if(Math.abs(x)<0.0000000001)break;w=w-c/x,w=Math.max(0,Math.min(1,w))}W[O]=v*R+3*S*w*L+3*h*k*C+A*D}return W}}class $9{constructor(J,Q,$,Z){if(J===void 0)throw Error("THREE.KeyframeTrack: track name is undefined");if(Q===void 0||Q.length===0)throw Error("THREE.KeyframeTrack: no keyframes in track named "+J);this.name=J,this.times=I8(Q,this.TimeBufferType),this.values=I8($,this.ValueBufferType),this.setInterpolation(Z||this.DefaultInterpolation)}static toJSON(J){let Q=J.constructor,$;if(Q.toJSON!==this.toJSON)$=Q.toJSON(J);else{$={name:J.name,times:I8(J.times,Array),values:I8(J.values,Array)};let Z=J.getInterpolation();if(Z!==J.DefaultInterpolation)$.interpolation=Z}return $.type=J.ValueTypeName,$}InterpolantFactoryMethodDiscrete(J){return new mW(this.times,this.values,this.getValueSize(),J)}InterpolantFactoryMethodLinear(J){return new H$(this.times,this.values,this.getValueSize(),J)}InterpolantFactoryMethodSmooth(J){return new pW(this.times,this.values,this.getValueSize(),J)}InterpolantFactoryMethodBezier(J){let Q=new dW(this.times,this.values,this.getValueSize(),J);if(this.settings)Q.settings=this.settings;return Q}setInterpolation(J){let Q;switch(J){case 2300:Q=this.InterpolantFactoryMethodDiscrete;break;case 2301:Q=this.InterpolantFactoryMethodLinear;break;case 2302:Q=this.InterpolantFactoryMethodSmooth;break;case 2303:Q=this.InterpolantFactoryMethodBezier;break}if(Q===void 0){let $="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(J!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error($);return q0("KeyframeTrack:",$),this}return this.createInterpolant=Q,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return 2300;case this.InterpolantFactoryMethodLinear:return 2301;case this.InterpolantFactoryMethodSmooth:return 2302;case this.InterpolantFactoryMethodBezier:return 2303}}getValueSize(){return this.values.length/this.times.length}shift(J){if(J!==0){let Q=this.times;for(let $=0,Z=Q.length;$!==Z;++$)Q[$]+=J}return this}scale(J){if(J!==1){let Q=this.times;for(let $=0,Z=Q.length;$!==Z;++$)Q[$]*=J}return this}trim(J,Q){let $=this.times,Z=$.length,W=0,K=Z-1;while(W!==Z&&$[W]<J)++W;while(K!==-1&&$[K]>Q)--K;if(++K,W!==0||K!==Z){if(W>=K)K=Math.max(K,1),W=K-1;let H=this.getValueSize();this.times=$.slice(W,K),this.values=this.values.slice(W*H,K*H)}return this}validate(){let J=!0,Q=this.getValueSize();if(Q-Math.floor(Q)!==0)j0("KeyframeTrack: Invalid value size in track.",this),J=!1;let $=this.times,Z=this.values,W=$.length;if(W===0)j0("KeyframeTrack: Track is empty.",this),J=!1;let K=null;for(let H=0;H!==W;H++){let Y=$[H];if(typeof Y==="number"&&isNaN(Y)){j0("KeyframeTrack: Time is not a valid number.",this,H,Y),J=!1;break}if(K!==null&&K>Y){j0("KeyframeTrack: Out of order keys.",this,H,Y,K),J=!1;break}K=Y}if(Z!==void 0){if(bY(Z))for(let H=0,Y=Z.length;H!==Y;++H){let X=Z[H];if(isNaN(X)){j0("KeyframeTrack: Value is not a valid number.",this,H,X),J=!1;break}}}return J}optimize(){let J=this.times.slice(),Q=this.values.slice(),$=this.getValueSize(),Z=this.getInterpolation()===2302,W=J.length-1,K=1;for(let H=1;H<W;++H){let Y=!1,X=J[H],U=J[H+1];if(X!==U&&(H!==1||X!==J[0]))if(!Z){let N=H*$,q=N-$,G=N+$;for(let E=0;E!==$;++E){let O=Q[N+E];if(O!==Q[q+E]||O!==Q[G+E]){Y=!0;break}}}else Y=!0;if(Y){if(H!==K){J[K]=J[H];let N=H*$,q=K*$;for(let G=0;G!==$;++G)Q[q+G]=Q[N+G]}++K}}if(W>0){J[K]=J[W];for(let H=W*$,Y=K*$,X=0;X!==$;++X)Q[Y+X]=Q[H+X];++K}if(K!==J.length)this.times=J.slice(0,K),this.values=Q.slice(0,K*$);else this.times=J,this.values=Q;return this}clone(){let J=this.times.slice(),Q=this.values.slice(),Z=new this.constructor(this.name,J,Q);return Z.createInterpolant=this.createInterpolant,Z}}$9.prototype.ValueTypeName="";$9.prototype.TimeBufferType=Float32Array;$9.prototype.ValueBufferType=Float32Array;$9.prototype.DefaultInterpolation=2301;class H8 extends $9{constructor(J,Q,$){super(J,Q,$)}}H8.prototype.ValueTypeName="bool";H8.prototype.ValueBufferType=Array;H8.prototype.DefaultInterpolation=2300;H8.prototype.InterpolantFactoryMethodLinear=void 0;H8.prototype.InterpolantFactoryMethodSmooth=void 0;class Y$ extends $9{constructor(J,Q,$,Z){super(J,Q,$,Z)}}Y$.prototype.ValueTypeName="color";class D7 extends $9{constructor(J,Q,$,Z){super(J,Q,$,Z)}}D7.prototype.ValueTypeName="number";class lW extends g8{constructor(J,Q,$,Z){super(J,Q,$,Z)}interpolate_(J,Q,$,Z){let W=this.resultBuffer,K=this.sampleValues,H=this.valueSize,Y=($-Q)/(Z-Q),X=J*H;for(let U=X+H;X!==U;X+=4)zJ.slerpFlat(W,0,K,X-H,K,X,Y);return W}}class A7 extends $9{constructor(J,Q,$,Z){super(J,Q,$,Z)}InterpolantFactoryMethodLinear(J){return new lW(this.times,this.values,this.getValueSize(),J)}}A7.prototype.ValueTypeName="quaternion";A7.prototype.InterpolantFactoryMethodSmooth=void 0;class Y8 extends $9{constructor(J,Q,$){super(J,Q,$)}}Y8.prototype.ValueTypeName="string";Y8.prototype.ValueBufferType=Array;Y8.prototype.DefaultInterpolation=2300;Y8.prototype.InterpolantFactoryMethodLinear=void 0;Y8.prototype.InterpolantFactoryMethodSmooth=void 0;class O7 extends $9{constructor(J,Q,$,Z){super(J,Q,$,Z)}}O7.prototype.ValueTypeName="vector";class R7{constructor(J="",Q=-1,$=[],Z=2500){if(this.name=J,this.tracks=$,this.duration=Q,this.blendMode=Z,this.uuid=eJ(),this.userData={},this.duration<0)this.resetDuration()}static parse(J){let Q=[],$=J.tracks,Z=1/(J.fps||1);for(let K=0,H=$.length;K!==H;++K)Q.push(TN($[K]).scale(Z));let W=new this(J.name,J.duration,Q,J.blendMode);return W.uuid=J.uuid,W.userData=JSON.parse(J.userData||"{}"),W}static toJSON(J){let Q=[],$=J.tracks,Z={name:J.name,duration:J.duration,tracks:Q,uuid:J.uuid,blendMode:J.blendMode,userData:JSON.stringify(J.userData)};for(let W=0,K=$.length;W!==K;++W)Q.push($9.toJSON($[W]));return Z}static CreateFromMorphTargetSequence(J,Q,$,Z){let W=Q.length,K=[];for(let H=0;H<W;H++){let Y=[],X=[];Y.push((H+W-1)%W,H,(H+1)%W),X.push(0,1,0);let U=UX(Y);if(Y=XZ(Y,1,U),X=XZ(X,1,U),!Z&&Y[0]===0)Y.push(W),X.push(X[0]);K.push(new D7(".morphTargetInfluences["+Q[H].name+"]",Y,X).scale(1/$))}return new this(J,-1,K)}static findByName(J,Q){let $=J;if(!Array.isArray(J)){let Z=J;$=Z.geometry&&Z.geometry.animations||Z.animations}for(let Z=0;Z<$.length;Z++)if($[Z].name===Q)return $[Z];return null}static CreateClipsFromMorphTargetSequences(J,Q,$){let Z={},W=/^([\w-]*?)([\d]+)$/;for(let H=0,Y=J.length;H<Y;H++){let X=J[H],U=X.name.match(W);if(U&&U.length>1){let N=U[1],q=Z[N];if(!q)Z[N]=q=[];q.push(X)}}let K=[];for(let H in Z)K.push(this.CreateFromMorphTargetSequence(H,Z[H],Q,$));return K}static parseAnimation(J,Q){if(q0("AnimationClip: parseAnimation() is deprecated and will be removed with r185"),!J)return j0("AnimationClip: No animation in JSONLoader data."),null;let $=function(N,q,G,E,O){if(G.length!==0){let R=[],D=[];if(gW(G,R,D,E),R.length!==0)O.push(new N(q,R,D))}},Z=[],W=J.name||"default",K=J.fps||30,H=J.blendMode,Y=J.length||-1,X=J.hierarchy||[];for(let N=0;N<X.length;N++){let q=X[N].keys;if(!q||q.length===0)continue;if(q[0].morphTargets){let G={},E;for(E=0;E<q.length;E++)if(q[E].morphTargets)for(let O=0;O<q[E].morphTargets.length;O++)G[q[E].morphTargets[O]]=-1;for(let O in G){let R=[],D=[];for(let F=0;F!==q[E].morphTargets.length;++F){let M=q[E];R.push(M.time),D.push(M.morphTarget===O?1:0)}Z.push(new D7(".morphTargetInfluence["+O+"]",R,D))}Y=G.length*K}else{let G=".bones["+Q[N].name+"]";$(O7,G+".position",q,"pos",Z),$(A7,G+".quaternion",q,"rot",Z),$(O7,G+".scale",q,"scl",Z)}}if(Z.length===0)return null;return new this(W,Y,Z,H)}resetDuration(){let J=this.tracks,Q=0;for(let $=0,Z=J.length;$!==Z;++$){let W=this.tracks[$];Q=Math.max(Q,W.times[W.times.length-1])}return this.duration=Q,this}trim(){for(let J=0;J<this.tracks.length;J++)this.tracks[J].trim(0,this.duration);return this}validate(){let J=!0;for(let Q=0;Q<this.tracks.length;Q++)J=J&&this.tracks[Q].validate();return J}optimize(){for(let J=0;J<this.tracks.length;J++)this.tracks[J].optimize();return this}clone(){let J=[];for(let $=0;$<this.tracks.length;$++)J.push(this.tracks[$].clone());let Q=new this.constructor(this.name,this.duration,J,this.blendMode);return Q.userData=JSON.parse(JSON.stringify(this.userData)),Q}toJSON(){return this.constructor.toJSON(this)}}function PN(J){switch(J.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return D7;case"vector":case"vector2":case"vector3":case"vector4":return O7;case"color":return Y$;case"quaternion":return A7;case"bool":case"boolean":return H8;case"string":return Y8}throw Error("THREE.KeyframeTrack: Unsupported typeName: "+J)}function TN(J){if(J.type===void 0)throw Error("THREE.KeyframeTrack: track type undefined, can not parse");let Q=PN(J.type);if(J.times===void 0){let $=[],Z=[];gW(J.keys,$,Z,"value"),J.times=$,J.values=Z}if(Q.parse!==void 0)return Q.parse(J);else return new Q(J.name,J.times,J.values,J.interpolation)}var V9={enabled:!1,files:{},add:function(J,Q){if(this.enabled===!1)return;if(OH(J))return;this.files[J]=Q},get:function(J){if(this.enabled===!1)return;if(OH(J))return;return this.files[J]},remove:function(J){delete this.files[J]},clear:function(){this.files={}}};function OH(J){try{let Q=J.slice(J.indexOf(":")+1);return new URL(Q).protocol==="blob:"}catch(Q){return!1}}class X${constructor(J,Q,$){let Z=this,W=!1,K=0,H=0,Y=void 0,X=[];this.onStart=void 0,this.onLoad=J,this.onProgress=Q,this.onError=$,this._abortController=null,this.itemStart=function(U){if(H++,W===!1){if(Z.onStart!==void 0)Z.onStart(U,K,H)}W=!0},this.itemEnd=function(U){if(K++,Z.onProgress!==void 0)Z.onProgress(U,K,H);if(K===H){if(W=!1,Z.onLoad!==void 0)Z.onLoad()}},this.itemError=function(U){if(Z.onError!==void 0)Z.onError(U)},this.resolveURL=function(U){if(Y)return Y(U);return U},this.setURLModifier=function(U){return Y=U,this},this.addHandler=function(U,N){return X.push(U,N),this},this.removeHandler=function(U){let N=X.indexOf(U);if(N!==-1)X.splice(N,2);return this},this.getHandler=function(U){for(let N=0,q=X.length;N<q;N+=2){let G=X[N],E=X[N+1];if(G.global)G.lastIndex=0;if(G.test(U))return E}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){if(!this._abortController)this._abortController=new AbortController;return this._abortController}}var NX=new X$;class dJ{constructor(J){if(this.manager=J!==void 0?J:NX,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(J,Q){let $=this;return new Promise(function(Z,W){$.load(J,Z,Q,W)})}parse(){}setCrossOrigin(J){return this.crossOrigin=J,this}setWithCredentials(J){return this.withCredentials=J,this}setPath(J){return this.path=J,this}setResourcePath(J){return this.resourcePath=J,this}setRequestHeader(J){return this.requestHeader=J,this}abort(){return this}}dJ.DEFAULT_MATERIAL_NAME="__DEFAULT";var f9={};class qX extends Error{constructor(J,Q){super(J);this.response=Q}}class B9 extends dJ{constructor(J){super(J);this.mimeType="",this.responseType="",this._abortController=new AbortController}load(J,Q,$,Z){if(J===void 0)J="";if(this.path!==void 0)J=this.path+J;J=this.manager.resolveURL(J);let W=V9.get(`file:${J}`);if(W!==void 0)return this.manager.itemStart(J),setTimeout(()=>{if(Q)Q(W);this.manager.itemEnd(J)},0),W;if(f9[J]!==void 0){f9[J].push({onLoad:Q,onProgress:$,onError:Z});return}f9[J]=[],f9[J].push({onLoad:Q,onProgress:$,onError:Z});let K=new Request(J,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin",signal:typeof AbortSignal.any==="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal}),H=this.mimeType,Y=this.responseType;fetch(K).then((X)=>{if(X.status===200||X.status===0){if(X.status===0)q0("FileLoader: HTTP Status 0 received.");if(typeof ReadableStream>"u"||X.body===void 0||X.body.getReader===void 0)return X;let U=f9[J],N=X.body.getReader(),q=X.headers.get("X-File-Size")||X.headers.get("Content-Length"),G=q?parseInt(q):0,E=G!==0,O=0,R=new ReadableStream({start(D){F();function F(){N.read().then(({done:M,value:L})=>{if(M)D.close();else{O+=L.byteLength;let B=new ProgressEvent("progress",{lengthComputable:E,loaded:O,total:G});for(let P=0,C=U.length;P<C;P++){let w=U[P];if(w.onProgress)w.onProgress(B)}D.enqueue(L),F()}},(M)=>{D.error(M)})}}});return new Response(R)}else throw new qX(`fetch for "${X.url}" responded with ${X.status}: ${X.statusText}`,X)}).then((X)=>{switch(Y){case"arraybuffer":return X.arrayBuffer();case"blob":return X.blob();case"document":return X.text().then((U)=>{return new DOMParser().parseFromString(U,H)});case"json":return X.json();default:if(H==="")return X.text();else{let N=/charset="?([^;"\s]*)"?/i.exec(H),q=N&&N[1]?N[1].toLowerCase():void 0,G=new TextDecoder(q);return X.arrayBuffer().then((E)=>G.decode(E))}}}).then((X)=>{V9.add(`file:${J}`,X);let U=f9[J];delete f9[J];for(let N=0,q=U.length;N<q;N++){let G=U[N];if(G.onLoad)G.onLoad(X)}}).catch((X)=>{let U=f9[J];if(U===void 0)throw this.manager.itemError(J),X;delete f9[J];for(let N=0,q=U.length;N<q;N++){let G=U[N];if(G.onError)G.onError(X)}this.manager.itemError(J)}).finally(()=>{this.manager.itemEnd(J)}),this.manager.itemStart(J)}setResponseType(J){return this.responseType=J,this}setMimeType(J){return this.mimeType=J,this}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}class EX extends dJ{constructor(J){super(J)}load(J,Q,$,Z){let W=this,K=new B9(this.manager);K.setPath(this.path),K.setRequestHeader(this.requestHeader),K.setWithCredentials(this.withCredentials),K.load(J,function(H){try{Q(W.parse(JSON.parse(H)))}catch(Y){if(Z)Z(Y);else j0(Y);W.manager.itemError(J)}},$,Z)}parse(J){let Q=[];for(let $=0;$<J.length;$++){let Z=R7.parse(J[$]);Q.push(Z)}return Q}}class FX extends dJ{constructor(J){super(J)}load(J,Q,$,Z){let W=this,K=[],H=new G6,Y=new B9(this.manager);Y.setPath(this.path),Y.setResponseType("arraybuffer"),Y.setRequestHeader(this.requestHeader),Y.setWithCredentials(W.withCredentials);let X=0;function U(N){Y.load(J[N],function(q){let G=W.parse(q,!0);if(K[N]={width:G.width,height:G.height,format:G.format,mipmaps:G.mipmaps},X+=1,X===6){if(G.mipmapCount===1)H.minFilter=1006;if(H.image=K,H.format=G.format,H.needsUpdate=!0,Q)Q(H)}},$,Z)}if(Array.isArray(J))for(let N=0,q=J.length;N<q;++N)U(N);else Y.load(J,function(N){let q=W.parse(N,!0);if(q.isCubemap){let G=q.mipmaps.length/q.mipmapCount;for(let E=0;E<G;E++){K[E]={mipmaps:[]};for(let O=0;O<q.mipmapCount;O++)K[E].mipmaps.push(q.mipmaps[E*q.mipmapCount+O]),K[E].format=q.format,K[E].width=q.width,K[E].height=q.height}H.image=K}else H.image.width=q.width,H.image.height=q.height,H.mipmaps=q.mipmaps;if(q.mipmapCount===1)H.minFilter=1006;if(H.format=q.format,H.needsUpdate=!0,Q)Q(H)},$,Z);return H}}var H7=new WeakMap;class k7 extends dJ{constructor(J){super(J)}load(J,Q,$,Z){if(this.path!==void 0)J=this.path+J;J=this.manager.resolveURL(J);let W=this,K=V9.get(`image:${J}`);if(K!==void 0){if(K.complete===!0)W.manager.itemStart(J),setTimeout(function(){if(Q)Q(K);W.manager.itemEnd(J)},0);else{let N=H7.get(K);if(N===void 0)N=[],H7.set(K,N);N.push({onLoad:Q,onError:Z})}return K}let H=E7("img");function Y(){if(U(),Q)Q(this);let N=H7.get(this)||[];for(let q=0;q<N.length;q++){let G=N[q];if(G.onLoad)G.onLoad(this)}H7.delete(this),W.manager.itemEnd(J)}function X(N){if(U(),Z)Z(N);V9.remove(`image:${J}`);let q=H7.get(this)||[];for(let G=0;G<q.length;G++){let E=q[G];if(E.onError)E.onError(N)}H7.delete(this),W.manager.itemError(J),W.manager.itemEnd(J)}function U(){H.removeEventListener("load",Y,!1),H.removeEventListener("error",X,!1)}if(H.addEventListener("load",Y,!1),H.addEventListener("error",X,!1),J.slice(0,5)!=="data:"){if(this.crossOrigin!==void 0)H.crossOrigin=this.crossOrigin}return V9.add(`image:${J}`,H),W.manager.itemStart(J),H.src=J,H}}class DX extends dJ{constructor(J){super(J)}load(J,Q,$,Z){let W=new C7;W.colorSpace="srgb";let K=new k7(this.manager);K.setCrossOrigin(this.crossOrigin),K.setPath(this.path);let H=0;function Y(X){K.load(J[X],function(U){if(W.images[X]=U,H++,H===6){if(W.needsUpdate=!0,Q)Q(W)}},void 0,Z)}for(let X=0;X<J.length;++X)Y(X);return W}}class OX extends dJ{constructor(J){super(J)}load(J,Q,$,Z){let W=this,K=new W9,H=new B9(this.manager);return H.setResponseType("arraybuffer"),H.setRequestHeader(this.requestHeader),H.setPath(this.path),H.setWithCredentials(W.withCredentials),H.load(J,function(Y){let X;try{X=W.parse(Y)}catch(U){if(Z!==void 0)Z(U);else{U(U);return}}if(X.image!==void 0)K.image=X.image;else if(X.data!==void 0)K.image.width=X.width,K.image.height=X.height,K.image.data=X.data;if(K.wrapS=X.wrapS!==void 0?X.wrapS:1001,K.wrapT=X.wrapT!==void 0?X.wrapT:1001,K.magFilter=X.magFilter!==void 0?X.magFilter:1006,K.minFilter=X.minFilter!==void 0?X.minFilter:1006,K.anisotropy=X.anisotropy!==void 0?X.anisotropy:1,X.colorSpace!==void 0)K.colorSpace=X.colorSpace;if(X.flipY!==void 0)K.flipY=X.flipY;if(X.format!==void 0)K.format=X.format;if(X.type!==void 0)K.type=X.type;if(X.mipmaps!==void 0)K.mipmaps=X.mipmaps,K.minFilter=1008;if(X.mipmapCount===1)K.minFilter=1006;if(X.generateMipmaps!==void 0)K.generateMipmaps=X.generateMipmaps;if(K.needsUpdate=!0,Q)Q(K,X)},$,Z),K}}class RX extends dJ{constructor(J){super(J)}load(J,Q,$,Z){let W=new kJ,K=new k7(this.manager);return K.setCrossOrigin(this.crossOrigin),K.setPath(this.path),K.load(J,function(H){if(W.image=H,W.needsUpdate=!0,Q!==void 0)Q(W)},$,Z),W}}class l9 extends $J{constructor(J,Q=1){super();this.isLight=!0,this.type="Light",this.color=new M0(J),this.intensity=Q}dispose(){this.dispatchEvent({type:"dispose"})}copy(J,Q){return super.copy(J,Q),this.color.copy(J.color),this.intensity=J.intensity,this}toJSON(J){let Q=super.toJSON(J);return Q.object.color=this.color.getHex(),Q.object.intensity=this.intensity,Q}}class uW extends l9{constructor(J,Q,$){super(J,$);this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy($J.DEFAULT_UP),this.updateMatrix(),this.groundColor=new M0(Q)}copy(J,Q){return super.copy(J,Q),this.groundColor.copy(J.groundColor),this}toJSON(J){let Q=super.toJSON(J);return Q.object.groundColor=this.groundColor.getHex(),Q}}var e$=new m0,RH=new _,kH=new _;class U${constructor(J){this.camera=J,this.intensity=1,this.bias=0,this.biasNode=null,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new s(512,512),this.mapType=1009,this.map=null,this.mapPass=null,this.matrix=new m0,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new b8,this._frameExtents=new s(1,1),this._viewportCount=1,this._viewports=[new qJ(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(J){let Q=this.camera,$=this.matrix;if(RH.setFromMatrixPosition(J.matrixWorld),Q.position.copy(RH),kH.setFromMatrixPosition(J.target.matrixWorld),Q.lookAt(kH),Q.updateMatrixWorld(),e$.multiplyMatrices(Q.projectionMatrix,Q.matrixWorldInverse),this._frustum.setFromProjectionMatrix(e$,Q.coordinateSystem,Q.reversedDepth),Q.coordinateSystem===2001||Q.reversedDepth)$.set(0.5,0,0,0.5,0,0.5,0,0.5,0,0,1,0,0,0,0,1);else $.set(0.5,0,0,0.5,0,0.5,0,0.5,0,0,0.5,0.5,0,0,0,1);$.multiply(e$)}getViewport(J){return this._viewports[J]}getFrameExtents(){return this._frameExtents}dispose(){if(this.map)this.map.dispose();if(this.mapPass)this.mapPass.dispose()}copy(J){return this.camera=J.camera.clone(),this.intensity=J.intensity,this.bias=J.bias,this.radius=J.radius,this.autoUpdate=J.autoUpdate,this.needsUpdate=J.needsUpdate,this.normalBias=J.normalBias,this.blurSamples=J.blurSamples,this.mapSize.copy(J.mapSize),this.biasNode=J.biasNode,this}clone(){return new this.constructor().copy(this)}toJSON(){let J={};if(this.intensity!==1)J.intensity=this.intensity;if(this.bias!==0)J.bias=this.bias;if(this.normalBias!==0)J.normalBias=this.normalBias;if(this.radius!==1)J.radius=this.radius;if(this.mapSize.x!==512||this.mapSize.y!==512)J.mapSize=this.mapSize.toArray();return J.camera=this.camera.toJSON(!1).object,delete J.camera.matrix,J}}var KQ=new _,HQ=new zJ,L9=new _;class O6 extends $J{constructor(){super();this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new m0,this.projectionMatrix=new m0,this.projectionMatrixInverse=new m0,this.coordinateSystem=2000,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(J,Q){return super.copy(J,Q),this.matrixWorldInverse.copy(J.matrixWorldInverse),this.projectionMatrix.copy(J.projectionMatrix),this.projectionMatrixInverse.copy(J.projectionMatrixInverse),this.coordinateSystem=J.coordinateSystem,this}getWorldDirection(J){return super.getWorldDirection(J).negate()}updateMatrixWorld(J){if(super.updateMatrixWorld(J),this.matrixWorld.decompose(KQ,HQ,L9),L9.x===1&&L9.y===1&&L9.z===1)this.matrixWorldInverse.copy(this.matrixWorld).invert();else this.matrixWorldInverse.compose(KQ,HQ,L9.set(1,1,1)).invert()}updateWorldMatrix(J,Q){if(super.updateWorldMatrix(J,Q),this.matrixWorld.decompose(KQ,HQ,L9),L9.x===1&&L9.y===1&&L9.z===1)this.matrixWorldInverse.copy(this.matrixWorld).invert();else this.matrixWorldInverse.compose(KQ,HQ,L9.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}}var r9=new _,MH=new s,LH=new s;class PJ extends O6{constructor(J=50,Q=1,$=0.1,Z=2000){super();this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=J,this.zoom=1,this.near=$,this.far=Z,this.focus=10,this.aspect=Q,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(J,Q){return super.copy(J,Q),this.fov=J.fov,this.zoom=J.zoom,this.near=J.near,this.far=J.far,this.focus=J.focus,this.aspect=J.aspect,this.view=J.view===null?null:Object.assign({},J.view),this.filmGauge=J.filmGauge,this.filmOffset=J.filmOffset,this}setFocalLength(J){let Q=0.5*this.getFilmHeight()/J;this.fov=w8*2*Math.atan(Q),this.updateProjectionMatrix()}getFocalLength(){let J=Math.tan(C8*0.5*this.fov);return 0.5*this.getFilmHeight()/J}getEffectiveFOV(){return w8*2*Math.atan(Math.tan(C8*0.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(J,Q,$){r9.set(-1,-1,0.5).applyMatrix4(this.projectionMatrixInverse),Q.set(r9.x,r9.y).multiplyScalar(-J/r9.z),r9.set(1,1,0.5).applyMatrix4(this.projectionMatrixInverse),$.set(r9.x,r9.y).multiplyScalar(-J/r9.z)}getViewSize(J,Q){return this.getViewBounds(J,MH,LH),Q.subVectors(LH,MH)}setViewOffset(J,Q,$,Z,W,K){if(this.aspect=J/Q,this.view===null)this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1};this.view.enabled=!0,this.view.fullWidth=J,this.view.fullHeight=Q,this.view.offsetX=$,this.view.offsetY=Z,this.view.width=W,this.view.height=K,this.updateProjectionMatrix()}clearViewOffset(){if(this.view!==null)this.view.enabled=!1;this.updateProjectionMatrix()}updateProjectionMatrix(){let J=this.near,Q=J*Math.tan(C8*0.5*this.fov)/this.zoom,$=2*Q,Z=this.aspect*$,W=-0.5*Z,K=this.view;if(this.view!==null&&this.view.enabled){let{fullWidth:Y,fullHeight:X}=K;W+=K.offsetX*Z/Y,Q-=K.offsetY*$/X,Z*=K.width/Y,$*=K.height/X}let H=this.filmOffset;if(H!==0)W+=J*H/this.getFilmWidth();this.projectionMatrix.makePerspective(W,W+Z,Q,Q-$,J,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(J){let Q=super.toJSON(J);if(Q.object.fov=this.fov,Q.object.zoom=this.zoom,Q.object.near=this.near,Q.object.far=this.far,Q.object.focus=this.focus,Q.object.aspect=this.aspect,this.view!==null)Q.object.view=Object.assign({},this.view);return Q.object.filmGauge=this.filmGauge,Q.object.filmOffset=this.filmOffset,Q}}class kX extends U${constructor(){super(new PJ(50,1,0.5,500));this.isSpotLightShadow=!0,this.focus=1,this.aspect=1}updateMatrices(J){let Q=this.camera,$=w8*2*J.angle*this.focus,Z=this.mapSize.width/this.mapSize.height*this.aspect,W=J.distance||Q.far;if($!==Q.fov||Z!==Q.aspect||W!==Q.far)Q.fov=$,Q.aspect=Z,Q.far=W,Q.updateProjectionMatrix();super.updateMatrices(J)}copy(J){return super.copy(J),this.focus=J.focus,this}}class cW extends l9{constructor(J,Q,$=0,Z=Math.PI/3,W=0,K=2){super(J,Q);this.isSpotLight=!0,this.type="SpotLight",this.position.copy($J.DEFAULT_UP),this.updateMatrix(),this.target=new $J,this.distance=$,this.angle=Z,this.penumbra=W,this.decay=K,this.map=null,this.shadow=new kX}get power(){return this.intensity*Math.PI}set power(J){this.intensity=J/Math.PI}dispose(){super.dispose(),this.shadow.dispose()}copy(J,Q){return super.copy(J,Q),this.distance=J.distance,this.angle=J.angle,this.penumbra=J.penumbra,this.decay=J.decay,this.target=J.target.clone(),this.map=J.map,this.shadow=J.shadow.clone(),this}toJSON(J){let Q=super.toJSON(J);if(Q.object.distance=this.distance,Q.object.angle=this.angle,Q.object.decay=this.decay,Q.object.penumbra=this.penumbra,Q.object.target=this.target.uuid,this.map&&this.map.isTexture)Q.object.map=this.map.toJSON(J).uuid;return Q.object.shadow=this.shadow.toJSON(),Q}}class MX extends U${constructor(){super(new PJ(90,1,0.5,500));this.isPointLightShadow=!0}}class nW extends l9{constructor(J,Q,$=0,Z=2){super(J,Q);this.isPointLight=!0,this.type="PointLight",this.distance=$,this.decay=Z,this.shadow=new MX}get power(){return this.intensity*4*Math.PI}set power(J){this.intensity=J/(4*Math.PI)}dispose(){super.dispose(),this.shadow.dispose()}copy(J,Q){return super.copy(J,Q),this.distance=J.distance,this.decay=J.decay,this.shadow=J.shadow.clone(),this}toJSON(J){let Q=super.toJSON(J);return Q.object.distance=this.distance,Q.object.decay=this.decay,Q.object.shadow=this.shadow.toJSON(),Q}}class _7 extends O6{constructor(J=-1,Q=1,$=1,Z=-1,W=0.1,K=2000){super();this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=J,this.right=Q,this.top=$,this.bottom=Z,this.near=W,this.far=K,this.updateProjectionMatrix()}copy(J,Q){return super.copy(J,Q),this.left=J.left,this.right=J.right,this.top=J.top,this.bottom=J.bottom,this.near=J.near,this.far=J.far,this.zoom=J.zoom,this.view=J.view===null?null:Object.assign({},J.view),this}setViewOffset(J,Q,$,Z,W,K){if(this.view===null)this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1};this.view.enabled=!0,this.view.fullWidth=J,this.view.fullHeight=Q,this.view.offsetX=$,this.view.offsetY=Z,this.view.width=W,this.view.height=K,this.updateProjectionMatrix()}clearViewOffset(){if(this.view!==null)this.view.enabled=!1;this.updateProjectionMatrix()}updateProjectionMatrix(){let J=(this.right-this.left)/(2*this.zoom),Q=(this.top-this.bottom)/(2*this.zoom),$=(this.right+this.left)/2,Z=(this.top+this.bottom)/2,W=$-J,K=$+J,H=Z+Q,Y=Z-Q;if(this.view!==null&&this.view.enabled){let X=(this.right-this.left)/this.view.fullWidth/this.zoom,U=(this.top-this.bottom)/this.view.fullHeight/this.zoom;W+=X*this.view.offsetX,K=W+X*this.view.width,H-=U*this.view.offsetY,Y=H-U*this.view.height}this.projectionMatrix.makeOrthographic(W,K,H,Y,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(J){let Q=super.toJSON(J);if(Q.object.zoom=this.zoom,Q.object.left=this.left,Q.object.right=this.right,Q.object.top=this.top,Q.object.bottom=this.bottom,Q.object.near=this.near,Q.object.far=this.far,this.view!==null)Q.object.view=Object.assign({},this.view);return Q}}class LX extends U${constructor(){super(new _7(-5,5,5,-5,0.5,500));this.isDirectionalLightShadow=!0}}class sW extends l9{constructor(J,Q){super(J,Q);this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy($J.DEFAULT_UP),this.updateMatrix(),this.target=new $J,this.shadow=new LX}dispose(){super.dispose(),this.shadow.dispose()}copy(J){return super.copy(J),this.target=J.target.clone(),this.shadow=J.shadow.clone(),this}toJSON(J){let Q=super.toJSON(J);return Q.object.shadow=this.shadow.toJSON(),Q.object.target=this.target.uuid,Q}}class iW extends l9{constructor(J,Q){super(J,Q);this.isAmbientLight=!0,this.type="AmbientLight"}}class oW extends l9{constructor(J,Q,$=10,Z=10){super(J,Q);this.isRectAreaLight=!0,this.type="RectAreaLight",this.width=$,this.height=Z}get power(){return this.intensity*this.width*this.height*Math.PI}set power(J){this.intensity=J/(this.width*this.height*Math.PI)}copy(J){return super.copy(J),this.width=J.width,this.height=J.height,this}toJSON(J){let Q=super.toJSON(J);return Q.object.width=this.width,Q.object.height=this.height,Q}}class G${constructor(){this.isSphericalHarmonics3=!0,this.coefficients=[];for(let J=0;J<9;J++)this.coefficients.push(new _)}set(J){for(let Q=0;Q<9;Q++)this.coefficients[Q].copy(J[Q]);return this}zero(){for(let J=0;J<9;J++)this.coefficients[J].set(0,0,0);return this}getAt(J,Q){let{x:$,y:Z,z:W}=J,K=this.coefficients;return Q.copy(K[0]).multiplyScalar(0.282095),Q.addScaledVector(K[1],0.488603*Z),Q.addScaledVector(K[2],0.488603*W),Q.addScaledVector(K[3],0.488603*$),Q.addScaledVector(K[4],1.092548*($*Z)),Q.addScaledVector(K[5],1.092548*(Z*W)),Q.addScaledVector(K[6],0.315392*(3*W*W-1)),Q.addScaledVector(K[7],1.092548*($*W)),Q.addScaledVector(K[8],0.546274*($*$-Z*Z)),Q}getIrradianceAt(J,Q){let{x:$,y:Z,z:W}=J,K=this.coefficients;return Q.copy(K[0]).multiplyScalar(0.886227),Q.addScaledVector(K[1],1.023328*Z),Q.addScaledVector(K[2],1.023328*W),Q.addScaledVector(K[3],1.023328*$),Q.addScaledVector(K[4],0.858086*$*Z),Q.addScaledVector(K[5],0.858086*Z*W),Q.addScaledVector(K[6],0.743125*W*W-0.247708),Q.addScaledVector(K[7],0.858086*$*W),Q.addScaledVector(K[8],0.429043*($*$-Z*Z)),Q}add(J){for(let Q=0;Q<9;Q++)this.coefficients[Q].add(J.coefficients[Q]);return this}addScaledSH(J,Q){for(let $=0;$<9;$++)this.coefficients[$].addScaledVector(J.coefficients[$],Q);return this}scale(J){for(let Q=0;Q<9;Q++)this.coefficients[Q].multiplyScalar(J);return this}lerp(J,Q){for(let $=0;$<9;$++)this.coefficients[$].lerp(J.coefficients[$],Q);return this}equals(J){for(let Q=0;Q<9;Q++)if(!this.coefficients[Q].equals(J.coefficients[Q]))return!1;return!0}copy(J){return this.set(J.coefficients)}clone(){return new this.constructor().copy(this)}fromArray(J,Q=0){let $=this.coefficients;for(let Z=0;Z<9;Z++)$[Z].fromArray(J,Q+Z*3);return this}toArray(J=[],Q=0){let $=this.coefficients;for(let Z=0;Z<9;Z++)$[Z].toArray(J,Q+Z*3);return J}static getBasisAt(J,Q){let{x:$,y:Z,z:W}=J;Q[0]=0.282095,Q[1]=0.488603*Z,Q[2]=0.488603*W,Q[3]=0.488603*$,Q[4]=1.092548*$*Z,Q[5]=1.092548*Z*W,Q[6]=0.315392*(3*W*W-1),Q[7]=1.092548*$*W,Q[8]=0.546274*($*$-Z*Z)}}class aW extends l9{constructor(J=new G$,Q=1){super(void 0,Q);this.isLightProbe=!0,this.sh=J}copy(J){return super.copy(J),this.sh.copy(J.sh),this}toJSON(J){let Q=super.toJSON(J);return Q.object.sh=this.sh.toArray(),Q}}class N$ extends dJ{constructor(J){super(J);this.textures={}}load(J,Q,$,Z){let W=this,K=new B9(W.manager);K.setPath(W.path),K.setRequestHeader(W.requestHeader),K.setWithCredentials(W.withCredentials),K.load(J,function(H){try{Q(W.parse(JSON.parse(H)))}catch(Y){if(Z)Z(Y);else j0(Y);W.manager.itemError(J)}},$,Z)}parse(J){let Q=this.textures;function $(W){if(Q[W]===void 0)q0("MaterialLoader: Undefined texture",W);return Q[W]}let Z=this.createMaterialFromType(J.type);if(J.uuid!==void 0)Z.uuid=J.uuid;if(J.name!==void 0)Z.name=J.name;if(J.color!==void 0&&Z.color!==void 0)Z.color.setHex(J.color);if(J.roughness!==void 0)Z.roughness=J.roughness;if(J.metalness!==void 0)Z.metalness=J.metalness;if(J.sheen!==void 0)Z.sheen=J.sheen;if(J.sheenColor!==void 0)Z.sheenColor=new M0().setHex(J.sheenColor);if(J.sheenRoughness!==void 0)Z.sheenRoughness=J.sheenRoughness;if(J.emissive!==void 0&&Z.emissive!==void 0)Z.emissive.setHex(J.emissive);if(J.specular!==void 0&&Z.specular!==void 0)Z.specular.setHex(J.specular);if(J.specularIntensity!==void 0)Z.specularIntensity=J.specularIntensity;if(J.specularColor!==void 0&&Z.specularColor!==void 0)Z.specularColor.setHex(J.specularColor);if(J.shininess!==void 0)Z.shininess=J.shininess;if(J.clearcoat!==void 0)Z.clearcoat=J.clearcoat;if(J.clearcoatRoughness!==void 0)Z.clearcoatRoughness=J.clearcoatRoughness;if(J.dispersion!==void 0)Z.dispersion=J.dispersion;if(J.iridescence!==void 0)Z.iridescence=J.iridescence;if(J.iridescenceIOR!==void 0)Z.iridescenceIOR=J.iridescenceIOR;if(J.iridescenceThicknessRange!==void 0)Z.iridescenceThicknessRange=J.iridescenceThicknessRange;if(J.transmission!==void 0)Z.transmission=J.transmission;if(J.thickness!==void 0)Z.thickness=J.thickness;if(J.attenuationDistance!==void 0)Z.attenuationDistance=J.attenuationDistance;if(J.attenuationColor!==void 0&&Z.attenuationColor!==void 0)Z.attenuationColor.setHex(J.attenuationColor);if(J.anisotropy!==void 0)Z.anisotropy=J.anisotropy;if(J.anisotropyRotation!==void 0)Z.anisotropyRotation=J.anisotropyRotation;if(J.fog!==void 0)Z.fog=J.fog;if(J.flatShading!==void 0)Z.flatShading=J.flatShading;if(J.blending!==void 0)Z.blending=J.blending;if(J.combine!==void 0)Z.combine=J.combine;if(J.side!==void 0)Z.side=J.side;if(J.shadowSide!==void 0)Z.shadowSide=J.shadowSide;if(J.opacity!==void 0)Z.opacity=J.opacity;if(J.transparent!==void 0)Z.transparent=J.transparent;if(J.alphaTest!==void 0)Z.alphaTest=J.alphaTest;if(J.alphaHash!==void 0)Z.alphaHash=J.alphaHash;if(J.depthFunc!==void 0)Z.depthFunc=J.depthFunc;if(J.depthTest!==void 0)Z.depthTest=J.depthTest;if(J.depthWrite!==void 0)Z.depthWrite=J.depthWrite;if(J.colorWrite!==void 0)Z.colorWrite=J.colorWrite;if(J.blendSrc!==void 0)Z.blendSrc=J.blendSrc;if(J.blendDst!==void 0)Z.blendDst=J.blendDst;if(J.blendEquation!==void 0)Z.blendEquation=J.blendEquation;if(J.blendSrcAlpha!==void 0)Z.blendSrcAlpha=J.blendSrcAlpha;if(J.blendDstAlpha!==void 0)Z.blendDstAlpha=J.blendDstAlpha;if(J.blendEquationAlpha!==void 0)Z.blendEquationAlpha=J.blendEquationAlpha;if(J.blendColor!==void 0&&Z.blendColor!==void 0)Z.blendColor.setHex(J.blendColor);if(J.blendAlpha!==void 0)Z.blendAlpha=J.blendAlpha;if(J.stencilWriteMask!==void 0)Z.stencilWriteMask=J.stencilWriteMask;if(J.stencilFunc!==void 0)Z.stencilFunc=J.stencilFunc;if(J.stencilRef!==void 0)Z.stencilRef=J.stencilRef;if(J.stencilFuncMask!==void 0)Z.stencilFuncMask=J.stencilFuncMask;if(J.stencilFail!==void 0)Z.stencilFail=J.stencilFail;if(J.stencilZFail!==void 0)Z.stencilZFail=J.stencilZFail;if(J.stencilZPass!==void 0)Z.stencilZPass=J.stencilZPass;if(J.stencilWrite!==void 0)Z.stencilWrite=J.stencilWrite;if(J.wireframe!==void 0)Z.wireframe=J.wireframe;if(J.wireframeLinewidth!==void 0)Z.wireframeLinewidth=J.wireframeLinewidth;if(J.wireframeLinecap!==void 0)Z.wireframeLinecap=J.wireframeLinecap;if(J.wireframeLinejoin!==void 0)Z.wireframeLinejoin=J.wireframeLinejoin;if(J.rotation!==void 0)Z.rotation=J.rotation;if(J.linewidth!==void 0)Z.linewidth=J.linewidth;if(J.dashSize!==void 0)Z.dashSize=J.dashSize;if(J.gapSize!==void 0)Z.gapSize=J.gapSize;if(J.scale!==void 0)Z.scale=J.scale;if(J.polygonOffset!==void 0)Z.polygonOffset=J.polygonOffset;if(J.polygonOffsetFactor!==void 0)Z.polygonOffsetFactor=J.polygonOffsetFactor;if(J.polygonOffsetUnits!==void 0)Z.polygonOffsetUnits=J.polygonOffsetUnits;if(J.dithering!==void 0)Z.dithering=J.dithering;if(J.alphaToCoverage!==void 0)Z.alphaToCoverage=J.alphaToCoverage;if(J.premultipliedAlpha!==void 0)Z.premultipliedAlpha=J.premultipliedAlpha;if(J.forceSinglePass!==void 0)Z.forceSinglePass=J.forceSinglePass;if(J.allowOverride!==void 0)Z.allowOverride=J.allowOverride;if(J.visible!==void 0)Z.visible=J.visible;if(J.toneMapped!==void 0)Z.toneMapped=J.toneMapped;if(J.userData!==void 0)Z.userData=J.userData;if(J.vertexColors!==void 0)if(typeof J.vertexColors==="number")Z.vertexColors=J.vertexColors>0?!0:!1;else Z.vertexColors=J.vertexColors;if(J.uniforms!==void 0)for(let W in J.uniforms){let K=J.uniforms[W];switch(Z.uniforms[W]={},K.type){case"t":Z.uniforms[W].value=$(K.value);break;case"c":Z.uniforms[W].value=new M0().setHex(K.value);break;case"v2":Z.uniforms[W].value=new s().fromArray(K.value);break;case"v3":Z.uniforms[W].value=new _().fromArray(K.value);break;case"v4":Z.uniforms[W].value=new qJ().fromArray(K.value);break;case"m3":Z.uniforms[W].value=new n0().fromArray(K.value);break;case"m4":Z.uniforms[W].value=new m0().fromArray(K.value);break;default:Z.uniforms[W].value=K.value}}if(J.defines!==void 0)Z.defines=J.defines;if(J.vertexShader!==void 0)Z.vertexShader=J.vertexShader;if(J.fragmentShader!==void 0)Z.fragmentShader=J.fragmentShader;if(J.glslVersion!==void 0)Z.glslVersion=J.glslVersion;if(J.extensions!==void 0)for(let W in J.extensions)Z.extensions[W]=J.extensions[W];if(J.lights!==void 0)Z.lights=J.lights;if(J.clipping!==void 0)Z.clipping=J.clipping;if(J.size!==void 0)Z.size=J.size;if(J.sizeAttenuation!==void 0)Z.sizeAttenuation=J.sizeAttenuation;if(J.map!==void 0)Z.map=$(J.map);if(J.matcap!==void 0)Z.matcap=$(J.matcap);if(J.alphaMap!==void 0)Z.alphaMap=$(J.alphaMap);if(J.bumpMap!==void 0)Z.bumpMap=$(J.bumpMap);if(J.bumpScale!==void 0)Z.bumpScale=J.bumpScale;if(J.normalMap!==void 0)Z.normalMap=$(J.normalMap);if(J.normalMapType!==void 0)Z.normalMapType=J.normalMapType;if(J.normalScale!==void 0){let W=J.normalScale;if(Array.isArray(W)===!1)W=[W,W];Z.normalScale=new s().fromArray(W)}if(J.displacementMap!==void 0)Z.displacementMap=$(J.displacementMap);if(J.displacementScale!==void 0)Z.displacementScale=J.displacementScale;if(J.displacementBias!==void 0)Z.displacementBias=J.displacementBias;if(J.roughnessMap!==void 0)Z.roughnessMap=$(J.roughnessMap);if(J.metalnessMap!==void 0)Z.metalnessMap=$(J.metalnessMap);if(J.emissiveMap!==void 0)Z.emissiveMap=$(J.emissiveMap);if(J.emissiveIntensity!==void 0)Z.emissiveIntensity=J.emissiveIntensity;if(J.specularMap!==void 0)Z.specularMap=$(J.specularMap);if(J.specularIntensityMap!==void 0)Z.specularIntensityMap=$(J.specularIntensityMap);if(J.specularColorMap!==void 0)Z.specularColorMap=$(J.specularColorMap);if(J.envMap!==void 0)Z.envMap=$(J.envMap);if(J.envMapRotation!==void 0)Z.envMapRotation.fromArray(J.envMapRotation);if(J.envMapIntensity!==void 0)Z.envMapIntensity=J.envMapIntensity;if(J.reflectivity!==void 0)Z.reflectivity=J.reflectivity;if(J.refractionRatio!==void 0)Z.refractionRatio=J.refractionRatio;if(J.lightMap!==void 0)Z.lightMap=$(J.lightMap);if(J.lightMapIntensity!==void 0)Z.lightMapIntensity=J.lightMapIntensity;if(J.aoMap!==void 0)Z.aoMap=$(J.aoMap);if(J.aoMapIntensity!==void 0)Z.aoMapIntensity=J.aoMapIntensity;if(J.gradientMap!==void 0)Z.gradientMap=$(J.gradientMap);if(J.clearcoatMap!==void 0)Z.clearcoatMap=$(J.clearcoatMap);if(J.clearcoatRoughnessMap!==void 0)Z.clearcoatRoughnessMap=$(J.clearcoatRoughnessMap);if(J.clearcoatNormalMap!==void 0)Z.clearcoatNormalMap=$(J.clearcoatNormalMap);if(J.clearcoatNormalScale!==void 0)Z.clearcoatNormalScale=new s().fromArray(J.clearcoatNormalScale);if(J.iridescenceMap!==void 0)Z.iridescenceMap=$(J.iridescenceMap);if(J.iridescenceThicknessMap!==void 0)Z.iridescenceThicknessMap=$(J.iridescenceThicknessMap);if(J.transmissionMap!==void 0)Z.transmissionMap=$(J.transmissionMap);if(J.thicknessMap!==void 0)Z.thicknessMap=$(J.thicknessMap);if(J.anisotropyMap!==void 0)Z.anisotropyMap=$(J.anisotropyMap);if(J.sheenColorMap!==void 0)Z.sheenColorMap=$(J.sheenColorMap);if(J.sheenRoughnessMap!==void 0)Z.sheenRoughnessMap=$(J.sheenRoughnessMap);return Z}setTextures(J){return this.textures=J,this}createMaterialFromType(J){return N$.createMaterialFromType(J)}static createMaterialFromType(J){return new{ShadowMaterial:TW,SpriteMaterial:yQ,RawShaderMaterial:$$,ShaderMaterial:Q9,PointsMaterial:hQ,MeshPhysicalMaterial:jW,MeshStandardMaterial:Z$,MeshPhongMaterial:yW,MeshToonMaterial:fW,MeshNormalMaterial:bW,MeshLambertMaterial:vW,MeshDepthMaterial:W$,MeshDistanceMaterial:K$,MeshBasicMaterial:d9,MeshMatcapMaterial:hW,LineDashedMaterial:xW,LineBasicMaterial:xJ,Material:yJ}[J]}}class RQ{static extractUrlBase(J){let Q=J.lastIndexOf("/");if(Q===-1)return"./";return J.slice(0,Q+1)}static resolveURL(J,Q){if(typeof J!=="string"||J==="")return"";if(/^https?:\/\//i.test(Q)&&/^\//.test(J))Q=Q.replace(/(^https?:\/\/[^\/]+).*/i,"$1");if(/^(https?:)?\/\//i.test(J))return J;if(/^data:.*,.*$/i.test(J))return J;if(/^blob:.*$/i.test(J))return J;return Q+J}}class rW extends u0{constructor(){super();this.isInstancedBufferGeometry=!0,this.type="InstancedBufferGeometry",this.instanceCount=1/0}copy(J){return super.copy(J),this.instanceCount=J.instanceCount,this}toJSON(){let J=super.toJSON();return J.instanceCount=this.instanceCount,J.isInstancedBufferGeometry=!0,J}}class tW extends dJ{constructor(J){super(J)}load(J,Q,$,Z){let W=this,K=new B9(W.manager);K.setPath(W.path),K.setRequestHeader(W.requestHeader),K.setWithCredentials(W.withCredentials),K.load(J,function(H){try{Q(W.parse(JSON.parse(H)))}catch(Y){if(Z)Z(Y);else j0(Y);W.manager.itemError(J)}},$,Z)}parse(J){let Q={},$={};function Z(G,E){if(Q[E]!==void 0)return Q[E];let R=G.interleavedBuffers[E],D=W(G,R.buffer),F=N7(R.type,D),M=new U6(F,R.stride);return M.uuid=R.uuid,Q[E]=M,M}function W(G,E){if($[E]!==void 0)return $[E];let R=G.arrayBuffers[E],D=new Uint32Array(R).buffer;return $[E]=D,D}let K=J.isInstancedBufferGeometry?new rW:new u0,H=J.data.index;if(H!==void 0){let G=N7(H.type,H.array);K.setIndex(new HJ(G,1))}let Y=J.data.attributes;for(let G in Y){let E=Y[G],O;if(E.isInterleavedBufferAttribute){let R=Z(J.data,E.data);O=new A8(R,E.itemSize,E.offset,E.normalized)}else{let R=N7(E.type,E.array);O=new(E.isInstancedBufferAttribute?_8:HJ)(R,E.itemSize,E.normalized)}if(E.name!==void 0)O.name=E.name;if(E.usage!==void 0)O.setUsage(E.usage);K.setAttribute(G,O)}let X=J.data.morphAttributes;if(X)for(let G in X){let E=X[G],O=[];for(let R=0,D=E.length;R<D;R++){let F=E[R],M;if(F.isInterleavedBufferAttribute){let L=Z(J.data,F.data);M=new A8(L,F.itemSize,F.offset,F.normalized)}else{let L=N7(F.type,F.array);M=new HJ(L,F.itemSize,F.normalized)}if(F.name!==void 0)M.name=F.name;O.push(M)}K.morphAttributes[G]=O}if(J.data.morphTargetsRelative)K.morphTargetsRelative=!0;let N=J.data.groups||J.data.drawcalls||J.data.offsets;if(N!==void 0)for(let G=0,E=N.length;G!==E;++G){let O=N[G];K.addGroup(O.start,O.count,O.materialIndex)}let q=J.data.boundingSphere;if(q!==void 0)K.boundingSphere=new TJ().fromJSON(q);if(J.name)K.name=J.name;if(J.userData)K.userData=J.userData;return K}}class VX extends dJ{constructor(J){super(J)}load(J,Q,$,Z){let W=this,K=this.path===""?RQ.extractUrlBase(J):this.path;this.resourcePath=this.resourcePath||K;let H=new B9(this.manager);H.setPath(this.path),H.setRequestHeader(this.requestHeader),H.setWithCredentials(this.withCredentials),H.load(J,function(Y){let X=null;try{X=JSON.parse(Y)}catch(N){if(Z!==void 0)Z(N);N("ObjectLoader: Can't parse "+J+".",N.message);return}let U=X.metadata;if(U===void 0||U.type===void 0||U.type.toLowerCase()==="geometry"){if(Z!==void 0)Z(Error("THREE.ObjectLoader: Can't load "+J));j0("ObjectLoader: Can't load "+J);return}W.parse(X,Q)},$,Z)}async loadAsync(J,Q){let $=this,Z=this.path===""?RQ.extractUrlBase(J):this.path;this.resourcePath=this.resourcePath||Z;let W=new B9(this.manager);W.setPath(this.path),W.setRequestHeader(this.requestHeader),W.setWithCredentials(this.withCredentials);let K=await W.loadAsync(J,Q),H;try{H=JSON.parse(K)}catch(X){throw Error("ObjectLoader: Can't parse "+J+". "+X.message)}let Y=H.metadata;if(Y===void 0||Y.type===void 0||Y.type.toLowerCase()==="geometry")throw Error("THREE.ObjectLoader: Can't load "+J);return await $.parseAsync(H)}parse(J,Q){let $=this.parseAnimations(J.animations),Z=this.parseShapes(J.shapes),W=this.parseGeometries(J.geometries,Z),K=this.parseImages(J.images,function(){if(Q!==void 0)Q(X)}),H=this.parseTextures(J.textures,K),Y=this.parseMaterials(J.materials,H),X=this.parseObject(J.object,W,Y,H,$),U=this.parseSkeletons(J.skeletons,X);if(this.bindSkeletons(X,U),this.bindLightTargets(X),Q!==void 0){let N=!1;for(let q in K)if(K[q].data instanceof HTMLImageElement){N=!0;break}if(N===!1)Q(X)}return X}async parseAsync(J){let Q=this.parseAnimations(J.animations),$=this.parseShapes(J.shapes),Z=this.parseGeometries(J.geometries,$),W=await this.parseImagesAsync(J.images),K=this.parseTextures(J.textures,W),H=this.parseMaterials(J.materials,K),Y=this.parseObject(J.object,Z,H,K,Q),X=this.parseSkeletons(J.skeletons,Y);return this.bindSkeletons(Y,X),this.bindLightTargets(Y),Y}parseShapes(J){let Q={};if(J!==void 0)for(let $=0,Z=J.length;$<Z;$++){let W=new e9().fromJSON(J[$]);Q[W.uuid]=W}return Q}parseSkeletons(J,Q){let $={},Z={};if(Q.traverse(function(W){if(W.isBone)Z[W.uuid]=W}),J!==void 0)for(let W=0,K=J.length;W<K;W++){let H=new bQ().fromJSON(J[W],Z);$[H.uuid]=H}return $}parseGeometries(J,Q){let $={};if(J!==void 0){let Z=new tW;for(let W=0,K=J.length;W<K;W++){let H,Y=J[W];switch(Y.type){case"BufferGeometry":case"InstancedBufferGeometry":H=Z.parse(Y);break;default:if(Y.type in DH)H=DH[Y.type].fromJSON(Y,Q);else q0(`ObjectLoader: Unsupported geometry type "${Y.type}"`)}if(H.uuid=Y.uuid,Y.name!==void 0)H.name=Y.name;if(Y.userData!==void 0)H.userData=Y.userData;$[Y.uuid]=H}}return $}parseMaterials(J,Q){let $={},Z={};if(J!==void 0){let W=new N$;W.setTextures(Q);for(let K=0,H=J.length;K<H;K++){let Y=J[K];if($[Y.uuid]===void 0)$[Y.uuid]=W.parse(Y);Z[Y.uuid]=$[Y.uuid]}}return Z}parseAnimations(J){let Q={};if(J!==void 0)for(let $=0;$<J.length;$++){let Z=J[$],W=R7.parse(Z);Q[W.uuid]=W}return Q}parseImages(J,Q){let $=this,Z={},W;function K(Y){return $.manager.itemStart(Y),W.load(Y,function(){$.manager.itemEnd(Y)},void 0,function(){$.manager.itemError(Y),$.manager.itemEnd(Y)})}function H(Y){if(typeof Y==="string"){let X=Y,U=/^(\/\/)|([a-z]+:(\/\/)?)/i.test(X)?X:$.resourcePath+X;return K(U)}else if(Y.data)return{data:N7(Y.type,Y.data),width:Y.width,height:Y.height};else return null}if(J!==void 0&&J.length>0){let Y=new X$(Q);W=new k7(Y),W.setCrossOrigin(this.crossOrigin);for(let X=0,U=J.length;X<U;X++){let N=J[X],q=N.url;if(Array.isArray(q)){let G=[];for(let E=0,O=q.length;E<O;E++){let R=q[E],D=H(R);if(D!==null)if(D instanceof HTMLImageElement)G.push(D);else G.push(new W9(D.data,D.width,D.height))}Z[N.uuid]=new v9(G)}else{let G=H(N.url);Z[N.uuid]=new v9(G)}}}return Z}async parseImagesAsync(J){let Q=this,$={},Z;async function W(K){if(typeof K==="string"){let H=K,Y=/^(\/\/)|([a-z]+:(\/\/)?)/i.test(H)?H:Q.resourcePath+H;return await Z.loadAsync(Y)}else if(K.data)return{data:N7(K.type,K.data),width:K.width,height:K.height};else return null}if(J!==void 0&&J.length>0){Z=new k7(this.manager),Z.setCrossOrigin(this.crossOrigin);for(let K=0,H=J.length;K<H;K++){let Y=J[K],X=Y.url;if(Array.isArray(X)){let U=[];for(let N=0,q=X.length;N<q;N++){let G=X[N],E=await W(G);if(E!==null)if(E instanceof HTMLImageElement)U.push(E);else U.push(new W9(E.data,E.width,E.height))}$[Y.uuid]=new v9(U)}else{let U=await W(Y.url);$[Y.uuid]=new v9(U)}}}return $}parseTextures(J,Q){function $(W,K){if(typeof W==="number")return W;return q0("ObjectLoader.parseTexture: Constant should be in numeric form.",W),K[W]}let Z={};if(J!==void 0)for(let W=0,K=J.length;W<K;W++){let H=J[W];if(H.image===void 0)q0('ObjectLoader: No "image" specified for',H.uuid);if(Q[H.image]===void 0)q0("ObjectLoader: Undefined image",H.image);let Y=Q[H.image],X=Y.data,U;if(Array.isArray(X)){if(U=new C7,X.length===6)U.needsUpdate=!0}else{if(X&&X.data)U=new W9;else U=new kJ;if(X)U.needsUpdate=!0}if(U.source=Y,U.uuid=H.uuid,H.name!==void 0)U.name=H.name;if(H.mapping!==void 0)U.mapping=$(H.mapping,SN);if(H.channel!==void 0)U.channel=H.channel;if(H.offset!==void 0)U.offset.fromArray(H.offset);if(H.repeat!==void 0)U.repeat.fromArray(H.repeat);if(H.center!==void 0)U.center.fromArray(H.center);if(H.rotation!==void 0)U.rotation=H.rotation;if(H.wrap!==void 0)U.wrapS=$(H.wrap[0],VH),U.wrapT=$(H.wrap[1],VH);if(H.format!==void 0)U.format=H.format;if(H.internalFormat!==void 0)U.internalFormat=H.internalFormat;if(H.type!==void 0)U.type=H.type;if(H.colorSpace!==void 0)U.colorSpace=H.colorSpace;if(H.minFilter!==void 0)U.minFilter=$(H.minFilter,BH);if(H.magFilter!==void 0)U.magFilter=$(H.magFilter,BH);if(H.anisotropy!==void 0)U.anisotropy=H.anisotropy;if(H.flipY!==void 0)U.flipY=H.flipY;if(H.generateMipmaps!==void 0)U.generateMipmaps=H.generateMipmaps;if(H.premultiplyAlpha!==void 0)U.premultiplyAlpha=H.premultiplyAlpha;if(H.unpackAlignment!==void 0)U.unpackAlignment=H.unpackAlignment;if(H.compareFunction!==void 0)U.compareFunction=H.compareFunction;if(H.userData!==void 0)U.userData=H.userData;Z[H.uuid]=U}return Z}parseObject(J,Q,$,Z,W){let K;function H(q){if(Q[q]===void 0)q0("ObjectLoader: Undefined geometry",q);return Q[q]}function Y(q){if(q===void 0)return;if(Array.isArray(q)){let G=[];for(let E=0,O=q.length;E<O;E++){let R=q[E];if($[R]===void 0)q0("ObjectLoader: Undefined material",R);G.push($[R])}return G}if($[q]===void 0)q0("ObjectLoader: Undefined material",q);return $[q]}function X(q){if(Z[q]===void 0)q0("ObjectLoader: Undefined texture",q);return Z[q]}let U,N;switch(J.type){case"Scene":if(K=new qW,J.background!==void 0)if(Number.isInteger(J.background))K.background=new M0(J.background);else K.background=X(J.background);if(J.environment!==void 0)K.environment=X(J.environment);if(J.fog!==void 0){if(J.fog.type==="Fog")K.fog=new TQ(J.fog.color,J.fog.near,J.fog.far);else if(J.fog.type==="FogExp2")K.fog=new PQ(J.fog.color,J.fog.density);if(J.fog.name!=="")K.fog.name=J.fog.name}if(J.backgroundBlurriness!==void 0)K.backgroundBlurriness=J.backgroundBlurriness;if(J.backgroundIntensity!==void 0)K.backgroundIntensity=J.backgroundIntensity;if(J.backgroundRotation!==void 0)K.backgroundRotation.fromArray(J.backgroundRotation);if(J.environmentIntensity!==void 0)K.environmentIntensity=J.environmentIntensity;if(J.environmentRotation!==void 0)K.environmentRotation.fromArray(J.environmentRotation);break;case"PerspectiveCamera":if(K=new PJ(J.fov,J.aspect,J.near,J.far),J.focus!==void 0)K.focus=J.focus;if(J.zoom!==void 0)K.zoom=J.zoom;if(J.filmGauge!==void 0)K.filmGauge=J.filmGauge;if(J.filmOffset!==void 0)K.filmOffset=J.filmOffset;if(J.view!==void 0)K.view=Object.assign({},J.view);break;case"OrthographicCamera":if(K=new _7(J.left,J.right,J.top,J.bottom,J.near,J.far),J.zoom!==void 0)K.zoom=J.zoom;if(J.view!==void 0)K.view=Object.assign({},J.view);break;case"AmbientLight":K=new iW(J.color,J.intensity);break;case"DirectionalLight":K=new sW(J.color,J.intensity),K.target=J.target||"";break;case"PointLight":K=new nW(J.color,J.intensity,J.distance,J.decay);break;case"RectAreaLight":K=new oW(J.color,J.intensity,J.width,J.height);break;case"SpotLight":K=new cW(J.color,J.intensity,J.distance,J.angle,J.penumbra,J.decay),K.target=J.target||"";break;case"HemisphereLight":K=new uW(J.color,J.groundColor,J.intensity);break;case"LightProbe":let q=new G$().fromArray(J.sh);K=new aW(q,J.intensity);break;case"SkinnedMesh":if(U=H(J.geometry),N=Y(J.material),K=new DW(U,N),J.bindMode!==void 0)K.bindMode=J.bindMode;if(J.bindMatrix!==void 0)K.bindMatrix.fromArray(J.bindMatrix);if(J.skeleton!==void 0)K.skeleton=J.skeleton;break;case"Mesh":U=H(J.geometry),N=Y(J.material),K=new VJ(U,N);break;case"InstancedMesh":U=H(J.geometry),N=Y(J.material);let{count:G,instanceMatrix:E,instanceColor:O}=J;if(K=new OW(U,N,G),K.instanceMatrix=new _8(new Float32Array(E.array),16),O!==void 0)K.instanceColor=new _8(new Float32Array(O.array),O.itemSize);break;case"BatchedMesh":if(U=H(J.geometry),N=Y(J.material),K=new RW(J.maxInstanceCount,J.maxVertexCount,J.maxIndexCount,N),K.geometry=U,K.perObjectFrustumCulled=J.perObjectFrustumCulled,K.sortObjects=J.sortObjects,K._drawRanges=J.drawRanges,K._reservedRanges=J.reservedRanges,K._geometryInfo=J.geometryInfo.map((R)=>{let D=null,F=null;if(R.boundingBox!==void 0)D=new jJ().fromJSON(R.boundingBox);if(R.boundingSphere!==void 0)F=new TJ().fromJSON(R.boundingSphere);return{...R,boundingBox:D,boundingSphere:F}}),K._instanceInfo=J.instanceInfo,K._availableInstanceIds=J._availableInstanceIds,K._availableGeometryIds=J._availableGeometryIds,K._nextIndexStart=J.nextIndexStart,K._nextVertexStart=J.nextVertexStart,K._geometryCount=J.geometryCount,K._maxInstanceCount=J.maxInstanceCount,K._maxVertexCount=J.maxVertexCount,K._maxIndexCount=J.maxIndexCount,K._geometryInitialized=J.geometryInitialized,K._matricesTexture=X(J.matricesTexture.uuid),K._indirectTexture=X(J.indirectTexture.uuid),J.colorsTexture!==void 0)K._colorsTexture=X(J.colorsTexture.uuid);if(J.boundingSphere!==void 0)K.boundingSphere=new TJ().fromJSON(J.boundingSphere);if(J.boundingBox!==void 0)K.boundingBox=new jJ().fromJSON(J.boundingBox);break;case"LOD":K=new FW;break;case"Line":K=new x9(H(J.geometry),Y(J.material));break;case"LineLoop":K=new kW(H(J.geometry),Y(J.material));break;case"LineSegments":K=new D9(H(J.geometry),Y(J.material));break;case"PointCloud":case"Points":K=new MW(H(J.geometry),Y(J.material));break;case"Sprite":K=new EW(Y(J.material));break;case"Group":K=new z8;break;case"Bone":K=new fQ;break;default:K=new $J}if(K.uuid=J.uuid,J.name!==void 0)K.name=J.name;if(J.matrix!==void 0){if(K.matrix.fromArray(J.matrix),J.matrixAutoUpdate!==void 0)K.matrixAutoUpdate=J.matrixAutoUpdate;if(K.matrixAutoUpdate)K.matrix.decompose(K.position,K.quaternion,K.scale)}else{if(J.position!==void 0)K.position.fromArray(J.position);if(J.rotation!==void 0)K.rotation.fromArray(J.rotation);if(J.quaternion!==void 0)K.quaternion.fromArray(J.quaternion);if(J.scale!==void 0)K.scale.fromArray(J.scale)}if(J.up!==void 0)K.up.fromArray(J.up);if(J.pivot!==void 0)K.pivot=new _().fromArray(J.pivot);if(J.morphTargetDictionary!==void 0)K.morphTargetDictionary=Object.assign({},J.morphTargetDictionary);if(J.morphTargetInfluences!==void 0)K.morphTargetInfluences=J.morphTargetInfluences.slice();if(J.castShadow!==void 0)K.castShadow=J.castShadow;if(J.receiveShadow!==void 0)K.receiveShadow=J.receiveShadow;if(J.shadow){if(J.shadow.intensity!==void 0)K.shadow.intensity=J.shadow.intensity;if(J.shadow.bias!==void 0)K.shadow.bias=J.shadow.bias;if(J.shadow.normalBias!==void 0)K.shadow.normalBias=J.shadow.normalBias;if(J.shadow.radius!==void 0)K.shadow.radius=J.shadow.radius;if(J.shadow.mapSize!==void 0)K.shadow.mapSize.fromArray(J.shadow.mapSize);if(J.shadow.camera!==void 0)K.shadow.camera=this.parseObject(J.shadow.camera)}if(J.visible!==void 0)K.visible=J.visible;if(J.frustumCulled!==void 0)K.frustumCulled=J.frustumCulled;if(J.renderOrder!==void 0)K.renderOrder=J.renderOrder;if(J.static!==void 0)K.static=J.static;if(J.userData!==void 0)K.userData=J.userData;if(J.layers!==void 0)K.layers.mask=J.layers;if(J.children!==void 0){let q=J.children;for(let G=0;G<q.length;G++)K.add(this.parseObject(q[G],Q,$,Z,W))}if(J.animations!==void 0){let q=J.animations;for(let G=0;G<q.length;G++){let E=q[G];K.animations.push(W[E])}}if(J.type==="LOD"){if(J.autoUpdate!==void 0)K.autoUpdate=J.autoUpdate;let q=J.levels;for(let G=0;G<q.length;G++){let E=q[G],O=K.getObjectByProperty("uuid",E.object);if(O!==void 0)K.addLevel(O,E.distance,E.hysteresis)}}return K}bindSkeletons(J,Q){if(Object.keys(Q).length===0)return;J.traverse(function($){if($.isSkinnedMesh===!0&&$.skeleton!==void 0){let Z=Q[$.skeleton];if(Z===void 0)q0("ObjectLoader: No skeleton found with UUID:",$.skeleton);else $.bind(Z,$.bindMatrix)}})}bindLightTargets(J){J.traverse(function(Q){if(Q.isDirectionalLight||Q.isSpotLight){let $=Q.target,Z=J.getObjectByProperty("uuid",$);if(Z!==void 0)Q.target=Z;else Q.target=new $J}})}}var SN={UVMapping:300,CubeReflectionMapping:301,CubeRefractionMapping:302,EquirectangularReflectionMapping:303,EquirectangularRefractionMapping:304,CubeUVReflectionMapping:306},VH={RepeatWrapping:1000,ClampToEdgeWrapping:1001,MirroredRepeatWrapping:1002},BH={NearestFilter:1003,NearestMipmapNearestFilter:1004,NearestMipmapLinearFilter:1005,LinearFilter:1006,LinearMipmapNearestFilter:1007,LinearMipmapLinearFilter:1008},JZ=new WeakMap;class BX extends dJ{constructor(J){super(J);if(this.isImageBitmapLoader=!0,typeof createImageBitmap>"u")q0("ImageBitmapLoader: createImageBitmap() not supported.");if(typeof fetch>"u")q0("ImageBitmapLoader: fetch() not supported.");this.options={premultiplyAlpha:"none"},this._abortController=new AbortController}setOptions(J){return this.options=J,this}load(J,Q,$,Z){if(J===void 0)J="";if(this.path!==void 0)J=this.path+J;J=this.manager.resolveURL(J);let W=this,K=V9.get(`image-bitmap:${J}`);if(K!==void 0){if(W.manager.itemStart(J),K.then){K.then((X)=>{if(JZ.has(K)===!0){if(Z)Z(JZ.get(K));W.manager.itemError(J),W.manager.itemEnd(J)}else{if(Q)Q(X);return W.manager.itemEnd(J),X}});return}return setTimeout(function(){if(Q)Q(K);W.manager.itemEnd(J)},0),K}let H={};H.credentials=this.crossOrigin==="anonymous"?"same-origin":"include",H.headers=this.requestHeader,H.signal=typeof AbortSignal.any==="function"?AbortSignal.any([this._abortController.signal,this.manager.abortController.signal]):this._abortController.signal;let Y=fetch(J,H).then(function(X){return X.blob()}).then(function(X){return createImageBitmap(X,Object.assign(W.options,{colorSpaceConversion:"none"}))}).then(function(X){if(V9.add(`image-bitmap:${J}`,X),Q)Q(X);return W.manager.itemEnd(J),X}).catch(function(X){if(Z)Z(X);JZ.set(Y,X),V9.remove(`image-bitmap:${J}`),W.manager.itemError(J),W.manager.itemEnd(J)});V9.add(`image-bitmap:${J}`,Y),W.manager.itemStart(J)}abort(){return this._abortController.abort(),this._abortController=new AbortController,this}}var YQ;class q${static getContext(){if(YQ===void 0)YQ=new(window.AudioContext||window.webkitAudioContext);return YQ}static setContext(J){YQ=J}}class zX extends dJ{constructor(J){super(J)}load(J,Q,$,Z){let W=this,K=new B9(this.manager);K.setResponseType("arraybuffer"),K.setPath(this.path),K.setRequestHeader(this.requestHeader),K.setWithCredentials(this.withCredentials),K.load(J,function(Y){try{let X=Y.slice(0);q$.getContext().decodeAudioData(X,function(N){Q(N)}).catch(H)}catch(X){H(X)}},$,Z);function H(Y){if(Z)Z(Y);else j0(Y);W.manager.itemError(J)}}}var zH=new m0,IH=new m0,R8=new m0;class IX{constructor(){this.type="StereoCamera",this.aspect=1,this.eyeSep=0.064,this.cameraL=new PJ,this.cameraL.layers.enable(1),this.cameraL.matrixAutoUpdate=!1,this.cameraR=new PJ,this.cameraR.layers.enable(2),this.cameraR.matrixAutoUpdate=!1,this._cache={focus:null,fov:null,aspect:null,near:null,far:null,zoom:null,eyeSep:null}}update(J){let Q=this._cache;if(Q.focus!==J.focus||Q.fov!==J.fov||Q.aspect!==J.aspect*this.aspect||Q.near!==J.near||Q.far!==J.far||Q.zoom!==J.zoom||Q.eyeSep!==this.eyeSep){Q.focus=J.focus,Q.fov=J.fov,Q.aspect=J.aspect*this.aspect,Q.near=J.near,Q.far=J.far,Q.zoom=J.zoom,Q.eyeSep=this.eyeSep,R8.copy(J.projectionMatrix);let Z=Q.eyeSep/2,W=Z*Q.near/Q.focus,K=Q.near*Math.tan(C8*Q.fov*0.5)/Q.zoom,H,Y;IH.elements[12]=-Z,zH.elements[12]=Z,H=-K*Q.aspect+W,Y=K*Q.aspect+W,R8.elements[0]=2*Q.near/(Y-H),R8.elements[8]=(Y+H)/(Y-H),this.cameraL.projectionMatrix.copy(R8),H=-K*Q.aspect-W,Y=K*Q.aspect-W,R8.elements[0]=2*Q.near/(Y-H),R8.elements[8]=(Y+H)/(Y-H),this.cameraR.projectionMatrix.copy(R8)}this.cameraL.matrixWorld.copy(J.matrixWorld).multiply(IH),this.cameraR.matrixWorld.copy(J.matrixWorld).multiply(zH)}}var Y7=-90,X7=1;class eW extends $J{constructor(J,Q,$){super();this.type="CubeCamera",this.renderTarget=$,this.coordinateSystem=null,this.activeMipmapLevel=0;let Z=new PJ(Y7,X7,J,Q);Z.layers=this.layers,this.add(Z);let W=new PJ(Y7,X7,J,Q);W.layers=this.layers,this.add(W);let K=new PJ(Y7,X7,J,Q);K.layers=this.layers,this.add(K);let H=new PJ(Y7,X7,J,Q);H.layers=this.layers,this.add(H);let Y=new PJ(Y7,X7,J,Q);Y.layers=this.layers,this.add(Y);let X=new PJ(Y7,X7,J,Q);X.layers=this.layers,this.add(X)}updateCoordinateSystem(){let J=this.coordinateSystem,Q=this.children.concat(),[$,Z,W,K,H,Y]=Q;for(let X of Q)this.remove(X);if(J===2000)$.up.set(0,1,0),$.lookAt(1,0,0),Z.up.set(0,1,0),Z.lookAt(-1,0,0),W.up.set(0,0,-1),W.lookAt(0,1,0),K.up.set(0,0,1),K.lookAt(0,-1,0),H.up.set(0,1,0),H.lookAt(0,0,1),Y.up.set(0,1,0),Y.lookAt(0,0,-1);else if(J===2001)$.up.set(0,-1,0),$.lookAt(-1,0,0),Z.up.set(0,-1,0),Z.lookAt(1,0,0),W.up.set(0,0,1),W.lookAt(0,1,0),K.up.set(0,0,-1),K.lookAt(0,-1,0),H.up.set(0,-1,0),H.lookAt(0,0,1),Y.up.set(0,-1,0),Y.lookAt(0,0,-1);else throw Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+J);for(let X of Q)this.add(X),X.updateMatrixWorld()}update(J,Q){if(this.parent===null)this.updateMatrixWorld();let{renderTarget:$,activeMipmapLevel:Z}=this;if(this.coordinateSystem!==J.coordinateSystem)this.coordinateSystem=J.coordinateSystem,this.updateCoordinateSystem();let[W,K,H,Y,X,U]=this.children,N=J.getRenderTarget(),q=J.getActiveCubeFace(),G=J.getActiveMipmapLevel(),E=J.xr.enabled;J.xr.enabled=!1;let O=$.texture.generateMipmaps;$.texture.generateMipmaps=!1;let R=!1;if(J.isWebGLRenderer===!0)R=J.state.buffers.depth.getReversed();else R=J.reversedDepthBuffer;if(J.setRenderTarget($,0,Z),R&&J.autoClear===!1)J.clearDepth();if(J.render(Q,W),J.setRenderTarget($,1,Z),R&&J.autoClear===!1)J.clearDepth();if(J.render(Q,K),J.setRenderTarget($,2,Z),R&&J.autoClear===!1)J.clearDepth();if(J.render(Q,H),J.setRenderTarget($,3,Z),R&&J.autoClear===!1)J.clearDepth();if(J.render(Q,Y),J.setRenderTarget($,4,Z),R&&J.autoClear===!1)J.clearDepth();if(J.render(Q,X),$.texture.generateMipmaps=O,J.setRenderTarget($,5,Z),R&&J.autoClear===!1)J.clearDepth();J.render(Q,U),J.setRenderTarget(N,q,G),J.xr.enabled=E,$.texture.needsPMREMUpdate=!0}}class JK extends PJ{constructor(J=[]){super();this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=J}}class QK{constructor(){this._previousTime=0,this._currentTime=0,this._startTime=performance.now(),this._delta=0,this._elapsed=0,this._timescale=1,this._document=null,this._pageVisibilityHandler=null}connect(J){if(this._document=J,J.hidden!==void 0)this._pageVisibilityHandler=jN.bind(this),J.addEventListener("visibilitychange",this._pageVisibilityHandler,!1)}disconnect(){if(this._pageVisibilityHandler!==null)this._document.removeEventListener("visibilitychange",this._pageVisibilityHandler),this._pageVisibilityHandler=null;this._document=null}getDelta(){return this._delta/1000}getElapsed(){return this._elapsed/1000}getTimescale(){return this._timescale}setTimescale(J){return this._timescale=J,this}reset(){return this._currentTime=performance.now()-this._startTime,this}dispose(){this.disconnect()}update(J){if(this._pageVisibilityHandler!==null&&this._document.hidden===!0)this._delta=0;else this._previousTime=this._currentTime,this._currentTime=(J!==void 0?J:performance.now())-this._startTime,this._delta=(this._currentTime-this._previousTime)*this._timescale,this._elapsed+=this._delta;return this}}function jN(){if(this._document.hidden===!1)this.reset()}var k8=new _,QZ=new zJ,yN=new _,M8=new _,L8=new _;class CX extends $J{constructor(){super();this.type="AudioListener",this.context=q$.getContext(),this.gain=this.context.createGain(),this.gain.connect(this.context.destination),this.filter=null,this.timeDelta=0,this._timer=new QK}getInput(){return this.gain}removeFilter(){if(this.filter!==null)this.gain.disconnect(this.filter),this.filter.disconnect(this.context.destination),this.gain.connect(this.context.destination),this.filter=null;return this}getFilter(){return this.filter}setFilter(J){if(this.filter!==null)this.gain.disconnect(this.filter),this.filter.disconnect(this.context.destination);else this.gain.disconnect(this.context.destination);return this.filter=J,this.gain.connect(this.filter),this.filter.connect(this.context.destination),this}getMasterVolume(){return this.gain.gain.value}setMasterVolume(J){return this.gain.gain.setTargetAtTime(J,this.context.currentTime,0.01),this}updateMatrixWorld(J){super.updateMatrixWorld(J),this._timer.update();let Q=this.context.listener;if(this.timeDelta=this._timer.getDelta(),this.matrixWorld.decompose(k8,QZ,yN),M8.set(0,0,-1).applyQuaternion(QZ),L8.set(0,1,0).applyQuaternion(QZ),Q.positionX){let $=this.context.currentTime+this.timeDelta;Q.positionX.linearRampToValueAtTime(k8.x,$),Q.positionY.linearRampToValueAtTime(k8.y,$),Q.positionZ.linearRampToValueAtTime(k8.z,$),Q.forwardX.linearRampToValueAtTime(M8.x,$),Q.forwardY.linearRampToValueAtTime(M8.y,$),Q.forwardZ.linearRampToValueAtTime(M8.z,$),Q.upX.linearRampToValueAtTime(L8.x,$),Q.upY.linearRampToValueAtTime(L8.y,$),Q.upZ.linearRampToValueAtTime(L8.z,$)}else Q.setPosition(k8.x,k8.y,k8.z),Q.setOrientation(M8.x,M8.y,M8.z,L8.x,L8.y,L8.z)}}class $K extends $J{constructor(J){super();this.type="Audio",this.listener=J,this.context=J.context,this.gain=this.context.createGain(),this.gain.connect(J.getInput()),this.autoplay=!1,this.buffer=null,this.detune=0,this.loop=!1,this.loopStart=0,this.loopEnd=0,this.offset=0,this.duration=void 0,this.playbackRate=1,this.isPlaying=!1,this.hasPlaybackControl=!0,this.source=null,this.sourceType="empty",this._startedAt=0,this._progress=0,this._connected=!1,this.filters=[]}getOutput(){return this.gain}setNodeSource(J){return this.hasPlaybackControl=!1,this.sourceType="audioNode",this.source=J,this.connect(),this}setMediaElementSource(J){return this.hasPlaybackControl=!1,this.sourceType="mediaNode",this.source=this.context.createMediaElementSource(J),this.connect(),this}setMediaStreamSource(J){return this.hasPlaybackControl=!1,this.sourceType="mediaStreamNode",this.source=this.context.createMediaStreamSource(J),this.connect(),this}setBuffer(J){if(this.buffer=J,this.sourceType="buffer",this.autoplay)this.play();return this}play(J=0){if(this.isPlaying===!0){q0("Audio: Audio is already playing.");return}if(this.hasPlaybackControl===!1){q0("Audio: this Audio has no playback control.");return}this._startedAt=this.context.currentTime+J;let Q=this.context.createBufferSource();return Q.buffer=this.buffer,Q.loop=this.loop,Q.loopStart=this.loopStart,Q.loopEnd=this.loopEnd,Q.onended=this.onEnded.bind(this),Q.start(this._startedAt,this._progress+this.offset,this.duration),this.isPlaying=!0,this.source=Q,this.setDetune(this.detune),this.setPlaybackRate(this.playbackRate),this.connect()}pause(){if(this.hasPlaybackControl===!1){q0("Audio: this Audio has no playback control.");return}if(this.isPlaying===!0){if(this._progress+=Math.max(this.context.currentTime-this._startedAt,0)*this.playbackRate,this.loop===!0)this._progress=this._progress%(this.duration||this.buffer.duration);this.source.stop(),this.source.onended=null,this.isPlaying=!1}return this}stop(J=0){if(this.hasPlaybackControl===!1){q0("Audio: this Audio has no playback control.");return}if(this._progress=0,this.source!==null)this.source.stop(this.context.currentTime+J),this.source.onended=null;return this.isPlaying=!1,this}connect(){if(this.filters.length>0){this.source.connect(this.filters[0]);for(let J=1,Q=this.filters.length;J<Q;J++)this.filters[J-1].connect(this.filters[J]);this.filters[this.filters.length-1].connect(this.getOutput())}else this.source.connect(this.getOutput());return this._connected=!0,this}disconnect(){if(this._connected===!1)return;if(this.filters.length>0){this.source.disconnect(this.filters[0]);for(let J=1,Q=this.filters.length;J<Q;J++)this.filters[J-1].disconnect(this.filters[J]);this.filters[this.filters.length-1].disconnect(this.getOutput())}else this.source.disconnect(this.getOutput());return this._connected=!1,this}getFilters(){return this.filters}setFilters(J){if(!J)J=[];if(this._connected===!0)this.disconnect(),this.filters=J.slice(),this.connect();else this.filters=J.slice();return this}setDetune(J){if(this.detune=J,this.isPlaying===!0&&this.source.detune!==void 0)this.source.detune.setTargetAtTime(this.detune,this.context.currentTime,0.01);return this}getDetune(){return this.detune}getFilter(){return this.getFilters()[0]}setFilter(J){return this.setFilters(J?[J]:[])}setPlaybackRate(J){if(this.hasPlaybackControl===!1){q0("Audio: this Audio has no playback control.");return}if(this.playbackRate=J,this.isPlaying===!0)this.source.playbackRate.setTargetAtTime(this.playbackRate,this.context.currentTime,0.01);return this}getPlaybackRate(){return this.playbackRate}onEnded(){this.isPlaying=!1,this._progress=0}getLoop(){if(this.hasPlaybackControl===!1)return q0("Audio: this Audio has no playback control."),!1;return this.loop}setLoop(J){if(this.hasPlaybackControl===!1){q0("Audio: this Audio has no playback control.");return}if(this.loop=J,this.isPlaying===!0)this.source.loop=this.loop;return this}setLoopStart(J){return this.loopStart=J,this}setLoopEnd(J){return this.loopEnd=J,this}getVolume(){return this.gain.gain.value}setVolume(J){return this.gain.gain.setTargetAtTime(J,this.context.currentTime,0.01),this}copy(J,Q){if(super.copy(J,Q),J.sourceType!=="buffer")return q0("Audio: Audio source type cannot be copied."),this;return this.autoplay=J.autoplay,this.buffer=J.buffer,this.detune=J.detune,this.loop=J.loop,this.loopStart=J.loopStart,this.loopEnd=J.loopEnd,this.offset=J.offset,this.duration=J.duration,this.playbackRate=J.playbackRate,this.hasPlaybackControl=J.hasPlaybackControl,this.sourceType=J.sourceType,this.filters=J.filters.slice(),this}clone(J){return new this.constructor(this.listener).copy(this,J)}}var V8=new _,CH=new zJ,fN=new _,B8=new _;class wX extends $K{constructor(J){super(J);this.panner=this.context.createPanner(),this.panner.panningModel="HRTF",this.panner.connect(this.gain)}connect(){return super.connect(),this.panner.connect(this.gain),this}disconnect(){return super.disconnect(),this.panner.disconnect(this.gain),this}getOutput(){return this.panner}getRefDistance(){return this.panner.refDistance}setRefDistance(J){return this.panner.refDistance=J,this}getRolloffFactor(){return this.panner.rolloffFactor}setRolloffFactor(J){return this.panner.rolloffFactor=J,this}getDistanceModel(){return this.panner.distanceModel}setDistanceModel(J){return this.panner.distanceModel=J,this}getMaxDistance(){return this.panner.maxDistance}setMaxDistance(J){return this.panner.maxDistance=J,this}setDirectionalCone(J,Q,$){return this.panner.coneInnerAngle=J,this.panner.coneOuterAngle=Q,this.panner.coneOuterGain=$,this}updateMatrixWorld(J){if(super.updateMatrixWorld(J),this.hasPlaybackControl===!0&&this.isPlaying===!1)return;this.matrixWorld.decompose(V8,CH,fN),B8.set(0,0,1).applyQuaternion(CH);let Q=this.panner;if(Q.positionX){let $=this.context.currentTime+this.listener.timeDelta;Q.positionX.linearRampToValueAtTime(V8.x,$),Q.positionY.linearRampToValueAtTime(V8.y,$),Q.positionZ.linearRampToValueAtTime(V8.z,$),Q.orientationX.linearRampToValueAtTime(B8.x,$),Q.orientationY.linearRampToValueAtTime(B8.y,$),Q.orientationZ.linearRampToValueAtTime(B8.z,$)}else Q.setPosition(V8.x,V8.y,V8.z),Q.setOrientation(B8.x,B8.y,B8.z)}}class AX{constructor(J,Q=2048){this.analyser=J.context.createAnalyser(),this.analyser.fftSize=Q,this.data=new Uint8Array(this.analyser.frequencyBinCount),J.getOutput().connect(this.analyser)}getFrequencyData(){return this.analyser.getByteFrequencyData(this.data),this.data}getAverageFrequency(){let J=0,Q=this.getFrequencyData();for(let $=0;$<Q.length;$++)J+=Q[$];return J/Q.length}}class ZK{constructor(J,Q,$){this.binding=J,this.valueSize=$;let Z,W,K;switch(Q){case"quaternion":Z=this._slerp,W=this._slerpAdditive,K=this._setAdditiveIdentityQuaternion,this.buffer=new Float64Array($*6),this._workIndex=5;break;case"string":case"bool":Z=this._select,W=this._select,K=this._setAdditiveIdentityOther,this.buffer=Array($*5);break;default:Z=this._lerp,W=this._lerpAdditive,K=this._setAdditiveIdentityNumeric,this.buffer=new Float64Array($*5)}this._mixBufferRegion=Z,this._mixBufferRegionAdditive=W,this._setIdentity=K,this._origIndex=3,this._addIndex=4,this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,this.useCount=0,this.referenceCount=0}accumulate(J,Q){let $=this.buffer,Z=this.valueSize,W=J*Z+Z,K=this.cumulativeWeight;if(K===0){for(let H=0;H!==Z;++H)$[W+H]=$[H];K=Q}else{K+=Q;let H=Q/K;this._mixBufferRegion($,W,0,H,Z)}this.cumulativeWeight=K}accumulateAdditive(J){let Q=this.buffer,$=this.valueSize,Z=$*this._addIndex;if(this.cumulativeWeightAdditive===0)this._setIdentity();this._mixBufferRegionAdditive(Q,Z,0,J,$),this.cumulativeWeightAdditive+=J}apply(J){let Q=this.valueSize,$=this.buffer,Z=J*Q+Q,W=this.cumulativeWeight,K=this.cumulativeWeightAdditive,H=this.binding;if(this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,W<1){let Y=Q*this._origIndex;this._mixBufferRegion($,Z,Y,1-W,Q)}if(K>0)this._mixBufferRegionAdditive($,Z,this._addIndex*Q,1,Q);for(let Y=Q,X=Q+Q;Y!==X;++Y)if($[Y]!==$[Y+Q]){H.setValue($,Z);break}}saveOriginalState(){let J=this.binding,Q=this.buffer,$=this.valueSize,Z=$*this._origIndex;J.getValue(Q,Z);for(let W=$,K=Z;W!==K;++W)Q[W]=Q[Z+W%$];this._setIdentity(),this.cumulativeWeight=0,this.cumulativeWeightAdditive=0}restoreOriginalState(){let J=this.valueSize*3;this.binding.setValue(this.buffer,J)}_setAdditiveIdentityNumeric(){let J=this._addIndex*this.valueSize,Q=J+this.valueSize;for(let $=J;$<Q;$++)this.buffer[$]=0}_setAdditiveIdentityQuaternion(){this._setAdditiveIdentityNumeric(),this.buffer[this._addIndex*this.valueSize+3]=1}_setAdditiveIdentityOther(){let J=this._origIndex*this.valueSize,Q=this._addIndex*this.valueSize;for(let $=0;$<this.valueSize;$++)this.buffer[Q+$]=this.buffer[J+$]}_select(J,Q,$,Z,W){if(Z>=0.5)for(let K=0;K!==W;++K)J[Q+K]=J[$+K]}_slerp(J,Q,$,Z){zJ.slerpFlat(J,Q,J,Q,J,$,Z)}_slerpAdditive(J,Q,$,Z,W){let K=this._workIndex*W;zJ.multiplyQuaternionsFlat(J,K,J,Q,J,$),zJ.slerpFlat(J,Q,J,Q,J,K,Z)}_lerp(J,Q,$,Z,W){let K=1-Z;for(let H=0;H!==W;++H){let Y=Q+H;J[Y]=J[Y]*K+J[$+H]*Z}}_lerpAdditive(J,Q,$,Z,W){for(let K=0;K!==W;++K){let H=Q+K;J[H]=J[H]+J[$+K]*Z}}}var WK="\\[\\]\\.:\\/",bN=new RegExp("["+WK+"]","g"),KK="[^"+WK+"]",vN="[^"+WK.replace("\\.","")+"]",hN=/((?:WC+[\/:])*)/.source.replace("WC",KK),xN=/(WCOD+)?/.source.replace("WCOD",vN),gN=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",KK),pN=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",KK),mN=new RegExp("^"+hN+xN+gN+pN+"$"),dN=["material","materials","bones","map"];class _X{constructor(J,Q,$){let Z=$||QJ.parseTrackName(Q);this._targetGroup=J,this._bindings=J.subscribe_(Q,Z)}getValue(J,Q){this.bind();let $=this._targetGroup.nCachedObjects_,Z=this._bindings[$];if(Z!==void 0)Z.getValue(J,Q)}setValue(J,Q){let $=this._bindings;for(let Z=this._targetGroup.nCachedObjects_,W=$.length;Z!==W;++Z)$[Z].setValue(J,Q)}bind(){let J=this._bindings;for(let Q=this._targetGroup.nCachedObjects_,$=J.length;Q!==$;++Q)J[Q].bind()}unbind(){let J=this._bindings;for(let Q=this._targetGroup.nCachedObjects_,$=J.length;Q!==$;++Q)J[Q].unbind()}}class QJ{constructor(J,Q,$){this.path=Q,this.parsedPath=$||QJ.parseTrackName(Q),this.node=QJ.findNode(J,this.parsedPath.nodeName),this.rootNode=J,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(J,Q,$){if(!(J&&J.isAnimationObjectGroup))return new QJ(J,Q,$);else return new QJ.Composite(J,Q,$)}static sanitizeNodeName(J){return J.replace(/\s/g,"_").replace(bN,"")}static parseTrackName(J){let Q=mN.exec(J);if(Q===null)throw Error("PropertyBinding: Cannot parse trackName: "+J);let $={nodeName:Q[2],objectName:Q[3],objectIndex:Q[4],propertyName:Q[5],propertyIndex:Q[6]},Z=$.nodeName&&$.nodeName.lastIndexOf(".");if(Z!==void 0&&Z!==-1){let W=$.nodeName.substring(Z+1);if(dN.indexOf(W)!==-1)$.nodeName=$.nodeName.substring(0,Z),$.objectName=W}if($.propertyName===null||$.propertyName.length===0)throw Error("PropertyBinding: can not parse propertyName from trackName: "+J);return $}static findNode(J,Q){if(Q===void 0||Q===""||Q==="."||Q===-1||Q===J.name||Q===J.uuid)return J;if(J.skeleton){let $=J.skeleton.getBoneByName(Q);if($!==void 0)return $}if(J.children){let $=function(W){for(let K=0;K<W.length;K++){let H=W[K];if(H.name===Q||H.uuid===Q)return H;let Y=$(H.children);if(Y)return Y}return null},Z=$(J.children);if(Z)return Z}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(J,Q){J[Q]=this.targetObject[this.propertyName]}_getValue_array(J,Q){let $=this.resolvedProperty;for(let Z=0,W=$.length;Z!==W;++Z)J[Q++]=$[Z]}_getValue_arrayElement(J,Q){J[Q]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(J,Q){this.resolvedProperty.toArray(J,Q)}_setValue_direct(J,Q){this.targetObject[this.propertyName]=J[Q]}_setValue_direct_setNeedsUpdate(J,Q){this.targetObject[this.propertyName]=J[Q],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(J,Q){this.targetObject[this.propertyName]=J[Q],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(J,Q){let $=this.resolvedProperty;for(let Z=0,W=$.length;Z!==W;++Z)$[Z]=J[Q++]}_setValue_array_setNeedsUpdate(J,Q){let $=this.resolvedProperty;for(let Z=0,W=$.length;Z!==W;++Z)$[Z]=J[Q++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(J,Q){let $=this.resolvedProperty;for(let Z=0,W=$.length;Z!==W;++Z)$[Z]=J[Q++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(J,Q){this.resolvedProperty[this.propertyIndex]=J[Q]}_setValue_arrayElement_setNeedsUpdate(J,Q){this.resolvedProperty[this.propertyIndex]=J[Q],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(J,Q){this.resolvedProperty[this.propertyIndex]=J[Q],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(J,Q){this.resolvedProperty.fromArray(J,Q)}_setValue_fromArray_setNeedsUpdate(J,Q){this.resolvedProperty.fromArray(J,Q),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(J,Q){this.resolvedProperty.fromArray(J,Q),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(J,Q){this.bind(),this.getValue(J,Q)}_setValue_unbound(J,Q){this.bind(),this.setValue(J,Q)}bind(){let J=this.node,Q=this.parsedPath,$=Q.objectName,Z=Q.propertyName,W=Q.propertyIndex;if(!J)J=QJ.findNode(this.rootNode,Q.nodeName),this.node=J;if(this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!J){q0("PropertyBinding: No target node found for track: "+this.path+".");return}if($){let X=Q.objectIndex;switch($){case"materials":if(!J.material){j0("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!J.material.materials){j0("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}J=J.material.materials;break;case"bones":if(!J.skeleton){j0("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}J=J.skeleton.bones;for(let U=0;U<J.length;U++)if(J[U].name===X){X=U;break}break;case"map":if("map"in J){J=J.map;break}if(!J.material){j0("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!J.material.map){j0("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}J=J.material.map;break;default:if(J[$]===void 0){j0("PropertyBinding: Can not bind to objectName of node undefined.",this);return}J=J[$]}if(X!==void 0){if(J[X]===void 0){j0("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,J);return}J=J[X]}}let K=J[Z];if(K===void 0){let X=Q.nodeName;j0("PropertyBinding: Trying to update property for track: "+X+"."+Z+" but it wasn't found.",J);return}let H=this.Versioning.None;if(this.targetObject=J,J.isMaterial===!0)H=this.Versioning.NeedsUpdate;else if(J.isObject3D===!0)H=this.Versioning.MatrixWorldNeedsUpdate;let Y=this.BindingType.Direct;if(W!==void 0){if(Z==="morphTargetInfluences"){if(!J.geometry){j0("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!J.geometry.morphAttributes){j0("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}if(J.morphTargetDictionary[W]!==void 0)W=J.morphTargetDictionary[W]}Y=this.BindingType.ArrayElement,this.resolvedProperty=K,this.propertyIndex=W}else if(K.fromArray!==void 0&&K.toArray!==void 0)Y=this.BindingType.HasFromToArray,this.resolvedProperty=K;else if(Array.isArray(K))Y=this.BindingType.EntireArray,this.resolvedProperty=K;else this.propertyName=Z;this.getValue=this.GetterByBindingType[Y],this.setValue=this.SetterByBindingTypeAndVersioning[Y][H]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}}QJ.Composite=_X;QJ.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};QJ.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};QJ.prototype.GetterByBindingType=[QJ.prototype._getValue_direct,QJ.prototype._getValue_array,QJ.prototype._getValue_arrayElement,QJ.prototype._getValue_toArray];QJ.prototype.SetterByBindingTypeAndVersioning=[[QJ.prototype._setValue_direct,QJ.prototype._setValue_direct_setNeedsUpdate,QJ.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[QJ.prototype._setValue_array,QJ.prototype._setValue_array_setNeedsUpdate,QJ.prototype._setValue_array_setMatrixWorldNeedsUpdate],[QJ.prototype._setValue_arrayElement,QJ.prototype._setValue_arrayElement_setNeedsUpdate,QJ.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[QJ.prototype._setValue_fromArray,QJ.prototype._setValue_fromArray_setNeedsUpdate,QJ.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];class PX{constructor(){this.isAnimationObjectGroup=!0,this.uuid=eJ(),this._objects=Array.prototype.slice.call(arguments),this.nCachedObjects_=0;let J={};this._indicesByUUID=J;for(let $=0,Z=arguments.length;$!==Z;++$)J[arguments[$].uuid]=$;this._paths=[],this._parsedPaths=[],this._bindings=[],this._bindingsIndicesByPath={};let Q=this;this.stats={objects:{get total(){return Q._objects.length},get inUse(){return this.total-Q.nCachedObjects_}},get bindingsPerObject(){return Q._bindings.length}}}add(){let J=this._objects,Q=this._indicesByUUID,$=this._paths,Z=this._parsedPaths,W=this._bindings,K=W.length,H=void 0,Y=J.length,X=this.nCachedObjects_;for(let U=0,N=arguments.length;U!==N;++U){let q=arguments[U],G=q.uuid,E=Q[G];if(E===void 0){E=Y++,Q[G]=E,J.push(q);for(let O=0,R=K;O!==R;++O)W[O].push(new QJ(q,$[O],Z[O]))}else if(E<X){H=J[E];let O=--X,R=J[O];Q[R.uuid]=E,J[E]=R,Q[G]=O,J[O]=q;for(let D=0,F=K;D!==F;++D){let M=W[D],L=M[O],B=M[E];if(M[E]=L,B===void 0)B=new QJ(q,$[D],Z[D]);M[O]=B}}else if(J[E]!==H)j0("AnimationObjectGroup: Different objects with the same UUID detected. Clean the caches or recreate your infrastructure when reloading scenes.")}this.nCachedObjects_=X}remove(){let J=this._objects,Q=this._indicesByUUID,$=this._bindings,Z=$.length,W=this.nCachedObjects_;for(let K=0,H=arguments.length;K!==H;++K){let Y=arguments[K],X=Y.uuid,U=Q[X];if(U!==void 0&&U>=W){let N=W++,q=J[N];Q[q.uuid]=U,J[U]=q,Q[X]=N,J[N]=Y;for(let G=0,E=Z;G!==E;++G){let O=$[G],R=O[N],D=O[U];O[U]=R,O[N]=D}}}this.nCachedObjects_=W}uncache(){let J=this._objects,Q=this._indicesByUUID,$=this._bindings,Z=$.length,W=this.nCachedObjects_,K=J.length;for(let H=0,Y=arguments.length;H!==Y;++H){let X=arguments[H],U=X.uuid,N=Q[U];if(N!==void 0)if(delete Q[U],N<W){let q=--W,G=J[q],E=--K,O=J[E];Q[G.uuid]=N,J[N]=G,Q[O.uuid]=q,J[q]=O,J.pop();for(let R=0,D=Z;R!==D;++R){let F=$[R],M=F[q],L=F[E];F[N]=M,F[q]=L,F.pop()}}else{let q=--K,G=J[q];if(q>0)Q[G.uuid]=N;J[N]=G,J.pop();for(let E=0,O=Z;E!==O;++E){let R=$[E];R[N]=R[q],R.pop()}}}this.nCachedObjects_=W}subscribe_(J,Q){let $=this._bindingsIndicesByPath,Z=$[J],W=this._bindings;if(Z!==void 0)return W[Z];let K=this._paths,H=this._parsedPaths,Y=this._objects,X=Y.length,U=this.nCachedObjects_,N=Array(X);Z=W.length,$[J]=Z,K.push(J),H.push(Q),W.push(N);for(let q=U,G=Y.length;q!==G;++q){let E=Y[q];N[q]=new QJ(E,J,Q)}return N}unsubscribe_(J){let Q=this._bindingsIndicesByPath,$=Q[J];if($!==void 0){let Z=this._paths,W=this._parsedPaths,K=this._bindings,H=K.length-1,Y=K[H],X=J[H];Q[X]=$,K[$]=Y,K.pop(),W[$]=W[H],W.pop(),Z[$]=Z[H],Z.pop()}}}class HK{constructor(J,Q,$=null,Z=Q.blendMode){this._mixer=J,this._clip=Q,this._localRoot=$,this.blendMode=Z;let W=Q.tracks,K=W.length,H=Array(K),Y={endingStart:2400,endingEnd:2400};for(let X=0;X!==K;++X){let U=W[X].createInterpolant(null);H[X]=U,U.settings=Y}this._interpolantSettings=Y,this._interpolants=H,this._propertyBindings=Array(K),this._cacheIndex=null,this._byClipCacheIndex=null,this._timeScaleInterpolant=null,this._weightInterpolant=null,this.loop=2201,this._loopCount=-1,this._startTime=null,this.time=0,this.timeScale=1,this._effectiveTimeScale=1,this.weight=1,this._effectiveWeight=1,this.repetitions=1/0,this.paused=!1,this.enabled=!0,this.clampWhenFinished=!1,this.zeroSlopeAtStart=!0,this.zeroSlopeAtEnd=!0}play(){return this._mixer._activateAction(this),this}stop(){return this._mixer._deactivateAction(this),this.reset()}reset(){return this.paused=!1,this.enabled=!0,this.time=0,this._loopCount=-1,this._startTime=null,this.stopFading().stopWarping()}isRunning(){return this.enabled&&!this.paused&&this.timeScale!==0&&this._startTime===null&&this._mixer._isActiveAction(this)}isScheduled(){return this._mixer._isActiveAction(this)}startAt(J){return this._startTime=J,this}setLoop(J,Q){return this.loop=J,this.repetitions=Q,this}setEffectiveWeight(J){return this.weight=J,this._effectiveWeight=this.enabled?J:0,this.stopFading()}getEffectiveWeight(){return this._effectiveWeight}fadeIn(J){return this._scheduleFading(J,0,1)}fadeOut(J){return this._scheduleFading(J,1,0)}crossFadeFrom(J,Q,$=!1){if(J.fadeOut(Q),this.fadeIn(Q),$===!0){let Z=this._clip.duration,W=J._clip.duration,K=W/Z,H=Z/W;J.warp(1,K,Q),this.warp(H,1,Q)}return this}crossFadeTo(J,Q,$=!1){return J.crossFadeFrom(this,Q,$)}stopFading(){let J=this._weightInterpolant;if(J!==null)this._weightInterpolant=null,this._mixer._takeBackControlInterpolant(J);return this}setEffectiveTimeScale(J){return this.timeScale=J,this._effectiveTimeScale=this.paused?0:J,this.stopWarping()}getEffectiveTimeScale(){return this._effectiveTimeScale}setDuration(J){return this.timeScale=this._clip.duration/J,this.stopWarping()}syncWith(J){return this.time=J.time,this.timeScale=J.timeScale,this.stopWarping()}halt(J){return this.warp(this._effectiveTimeScale,0,J)}warp(J,Q,$){let Z=this._mixer,W=Z.time,K=this.timeScale,H=this._timeScaleInterpolant;if(H===null)H=Z._lendControlInterpolant(),this._timeScaleInterpolant=H;let{parameterPositions:Y,sampleValues:X}=H;return Y[0]=W,Y[1]=W+$,X[0]=J/K,X[1]=Q/K,this}stopWarping(){let J=this._timeScaleInterpolant;if(J!==null)this._timeScaleInterpolant=null,this._mixer._takeBackControlInterpolant(J);return this}getMixer(){return this._mixer}getClip(){return this._clip}getRoot(){return this._localRoot||this._mixer._root}_update(J,Q,$,Z){if(!this.enabled){this._updateWeight(J);return}let W=this._startTime;if(W!==null){let Y=(J-W)*$;if(Y<0||$===0)Q=0;else this._startTime=null,Q=$*Y}Q*=this._updateTimeScale(J);let K=this._updateTime(Q),H=this._updateWeight(J);if(H>0){let Y=this._interpolants,X=this._propertyBindings;switch(this.blendMode){case 2501:for(let U=0,N=Y.length;U!==N;++U)Y[U].evaluate(K),X[U].accumulateAdditive(H);break;case 2500:default:for(let U=0,N=Y.length;U!==N;++U)Y[U].evaluate(K),X[U].accumulate(Z,H)}}}_updateWeight(J){let Q=0;if(this.enabled){Q=this.weight;let $=this._weightInterpolant;if($!==null){let Z=$.evaluate(J)[0];if(Q*=Z,J>$.parameterPositions[1]){if(this.stopFading(),Z===0)this.enabled=!1}}}return this._effectiveWeight=Q,Q}_updateTimeScale(J){let Q=0;if(!this.paused){Q=this.timeScale;let $=this._timeScaleInterpolant;if($!==null){let Z=$.evaluate(J)[0];if(Q*=Z,J>$.parameterPositions[1])if(this.stopWarping(),Q===0)this.paused=!0;else this.timeScale=Q}}return this._effectiveTimeScale=Q,Q}_updateTime(J){let Q=this._clip.duration,$=this.loop,Z=this.time+J,W=this._loopCount,K=$===2202;if(J===0){if(W===-1)return Z;return K&&(W&1)===1?Q-Z:Z}if($===2200){if(W===-1)this._loopCount=0,this._setEndings(!0,!0,!1);J:{if(Z>=Q)Z=Q;else if(Z<0)Z=0;else{this.time=Z;break J}if(this.clampWhenFinished)this.paused=!0;else this.enabled=!1;this.time=Z,this._mixer.dispatchEvent({type:"finished",action:this,direction:J<0?-1:1})}}else{if(W===-1)if(J>=0)W=0,this._setEndings(!0,this.repetitions===0,K);else this._setEndings(this.repetitions===0,!0,K);if(Z>=Q||Z<0){let H=Math.floor(Z/Q);Z-=Q*H,W+=Math.abs(H);let Y=this.repetitions-W;if(Y<=0){if(this.clampWhenFinished)this.paused=!0;else this.enabled=!1;Z=J>0?Q:0,this.time=Z,this._mixer.dispatchEvent({type:"finished",action:this,direction:J>0?1:-1})}else{if(Y===1){let X=J<0;this._setEndings(X,!X,K)}else this._setEndings(!1,!1,K);this._loopCount=W,this.time=Z,this._mixer.dispatchEvent({type:"loop",action:this,loopDelta:H})}}else this.time=Z;if(K&&(W&1)===1)return Q-Z}return Z}_setEndings(J,Q,$){let Z=this._interpolantSettings;if($)Z.endingStart=2401,Z.endingEnd=2401;else{if(J)Z.endingStart=this.zeroSlopeAtStart?2401:2400;else Z.endingStart=2402;if(Q)Z.endingEnd=this.zeroSlopeAtEnd?2401:2400;else Z.endingEnd=2402}}_scheduleFading(J,Q,$){let Z=this._mixer,W=Z.time,K=this._weightInterpolant;if(K===null)K=Z._lendControlInterpolant(),this._weightInterpolant=K;let{parameterPositions:H,sampleValues:Y}=K;return H[0]=W,Y[0]=Q,H[1]=W+J,Y[1]=$,this}}var lN=new Float32Array(1);class TX extends F9{constructor(J){super();if(this._root=J,this._initMemoryManager(),this._accuIndex=0,this.time=0,this.timeScale=1,typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}_bindAction(J,Q){let $=J._localRoot||this._root,Z=J._clip.tracks,W=Z.length,K=J._propertyBindings,H=J._interpolants,Y=$.uuid,X=this._bindingsByRootAndName,U=X[Y];if(U===void 0)U={},X[Y]=U;for(let N=0;N!==W;++N){let q=Z[N],G=q.name,E=U[G];if(E!==void 0)++E.referenceCount,K[N]=E;else{if(E=K[N],E!==void 0){if(E._cacheIndex===null)++E.referenceCount,this._addInactiveBinding(E,Y,G);continue}let O=Q&&Q._propertyBindings[N].binding.parsedPath;E=new ZK(QJ.create($,G,O),q.ValueTypeName,q.getValueSize()),++E.referenceCount,this._addInactiveBinding(E,Y,G),K[N]=E}H[N].resultBuffer=E.buffer}}_activateAction(J){if(!this._isActiveAction(J)){if(J._cacheIndex===null){let $=(J._localRoot||this._root).uuid,Z=J._clip.uuid,W=this._actionsByClip[Z];this._bindAction(J,W&&W.knownActions[0]),this._addInactiveAction(J,Z,$)}let Q=J._propertyBindings;for(let $=0,Z=Q.length;$!==Z;++$){let W=Q[$];if(W.useCount++===0)this._lendBinding(W),W.saveOriginalState()}this._lendAction(J)}}_deactivateAction(J){if(this._isActiveAction(J)){let Q=J._propertyBindings;for(let $=0,Z=Q.length;$!==Z;++$){let W=Q[$];if(--W.useCount===0)W.restoreOriginalState(),this._takeBackBinding(W)}this._takeBackAction(J)}}_initMemoryManager(){this._actions=[],this._nActiveActions=0,this._actionsByClip={},this._bindings=[],this._nActiveBindings=0,this._bindingsByRootAndName={},this._controlInterpolants=[],this._nActiveControlInterpolants=0;let J=this;this.stats={actions:{get total(){return J._actions.length},get inUse(){return J._nActiveActions}},bindings:{get total(){return J._bindings.length},get inUse(){return J._nActiveBindings}},controlInterpolants:{get total(){return J._controlInterpolants.length},get inUse(){return J._nActiveControlInterpolants}}}}_isActiveAction(J){let Q=J._cacheIndex;return Q!==null&&Q<this._nActiveActions}_addInactiveAction(J,Q,$){let Z=this._actions,W=this._actionsByClip,K=W[Q];if(K===void 0)K={knownActions:[J],actionByRoot:{}},J._byClipCacheIndex=0,W[Q]=K;else{let H=K.knownActions;J._byClipCacheIndex=H.length,H.push(J)}J._cacheIndex=Z.length,Z.push(J),K.actionByRoot[$]=J}_removeInactiveAction(J){let Q=this._actions,$=Q[Q.length-1],Z=J._cacheIndex;$._cacheIndex=Z,Q[Z]=$,Q.pop(),J._cacheIndex=null;let W=J._clip.uuid,K=this._actionsByClip,H=K[W],Y=H.knownActions,X=Y[Y.length-1],U=J._byClipCacheIndex;X._byClipCacheIndex=U,Y[U]=X,Y.pop(),J._byClipCacheIndex=null;let N=H.actionByRoot,q=(J._localRoot||this._root).uuid;if(delete N[q],Y.length===0)delete K[W];this._removeInactiveBindingsForAction(J)}_removeInactiveBindingsForAction(J){let Q=J._propertyBindings;for(let $=0,Z=Q.length;$!==Z;++$){let W=Q[$];if(--W.referenceCount===0)this._removeInactiveBinding(W)}}_lendAction(J){let Q=this._actions,$=J._cacheIndex,Z=this._nActiveActions++,W=Q[Z];J._cacheIndex=Z,Q[Z]=J,W._cacheIndex=$,Q[$]=W}_takeBackAction(J){let Q=this._actions,$=J._cacheIndex,Z=--this._nActiveActions,W=Q[Z];J._cacheIndex=Z,Q[Z]=J,W._cacheIndex=$,Q[$]=W}_addInactiveBinding(J,Q,$){let Z=this._bindingsByRootAndName,W=this._bindings,K=Z[Q];if(K===void 0)K={},Z[Q]=K;K[$]=J,J._cacheIndex=W.length,W.push(J)}_removeInactiveBinding(J){let Q=this._bindings,$=J.binding,Z=$.rootNode.uuid,W=$.path,K=this._bindingsByRootAndName,H=K[Z],Y=Q[Q.length-1],X=J._cacheIndex;if(Y._cacheIndex=X,Q[X]=Y,Q.pop(),delete H[W],Object.keys(H).length===0)delete K[Z]}_lendBinding(J){let Q=this._bindings,$=J._cacheIndex,Z=this._nActiveBindings++,W=Q[Z];J._cacheIndex=Z,Q[Z]=J,W._cacheIndex=$,Q[$]=W}_takeBackBinding(J){let Q=this._bindings,$=J._cacheIndex,Z=--this._nActiveBindings,W=Q[Z];J._cacheIndex=Z,Q[Z]=J,W._cacheIndex=$,Q[$]=W}_lendControlInterpolant(){let J=this._controlInterpolants,Q=this._nActiveControlInterpolants++,$=J[Q];if($===void 0)$=new H$(new Float32Array(2),new Float32Array(2),1,lN),$.__cacheIndex=Q,J[Q]=$;return $}_takeBackControlInterpolant(J){let Q=this._controlInterpolants,$=J.__cacheIndex,Z=--this._nActiveControlInterpolants,W=Q[Z];J.__cacheIndex=Z,Q[Z]=J,W.__cacheIndex=$,Q[$]=W}clipAction(J,Q,$){let Z=Q||this._root,W=Z.uuid,K=typeof J==="string"?R7.findByName(Z,J):J,H=K!==null?K.uuid:J,Y=this._actionsByClip[H],X=null;if($===void 0)if(K!==null)$=K.blendMode;else $=2500;if(Y!==void 0){let N=Y.actionByRoot[W];if(N!==void 0&&N.blendMode===$)return N;if(X=Y.knownActions[0],K===null)K=X._clip}if(K===null)return null;let U=new HK(this,K,Q,$);return this._bindAction(U,X),this._addInactiveAction(U,H,W),U}existingAction(J,Q){let $=Q||this._root,Z=$.uuid,W=typeof J==="string"?R7.findByName($,J):J,K=W?W.uuid:J,H=this._actionsByClip[K];if(H!==void 0)return H.actionByRoot[Z]||null;return null}stopAllAction(){let J=this._actions,Q=this._nActiveActions;for(let $=Q-1;$>=0;--$)J[$].stop();return this}update(J){J*=this.timeScale;let Q=this._actions,$=this._nActiveActions,Z=this.time+=J,W=Math.sign(J),K=this._accuIndex^=1;for(let X=0;X!==$;++X)Q[X]._update(Z,J,W,K);let H=this._bindings,Y=this._nActiveBindings;for(let X=0;X!==Y;++X)H[X].apply(K);return this}setTime(J){this.time=0;for(let Q=0;Q<this._actions.length;Q++)this._actions[Q].time=0;return this.update(J)}getRoot(){return this._root}uncacheClip(J){let Q=this._actions,$=J.uuid,Z=this._actionsByClip,W=Z[$];if(W!==void 0){let K=W.knownActions;for(let H=0,Y=K.length;H!==Y;++H){let X=K[H];this._deactivateAction(X);let U=X._cacheIndex,N=Q[Q.length-1];X._cacheIndex=null,X._byClipCacheIndex=null,N._cacheIndex=U,Q[U]=N,Q.pop(),this._removeInactiveBindingsForAction(X)}delete Z[$]}}uncacheRoot(J){let Q=J.uuid,$=this._actionsByClip;for(let K in $){let H=$[K].actionByRoot,Y=H[Q];if(Y!==void 0)this._deactivateAction(Y),this._removeInactiveAction(Y)}let Z=this._bindingsByRootAndName,W=Z[Q];if(W!==void 0)for(let K in W){let H=W[K];H.restoreOriginalState(),this._removeInactiveBinding(H)}}uncacheAction(J,Q){let $=this.existingAction(J,Q);if($!==null)this._deactivateAction($),this._removeInactiveAction($)}}class SX extends _Q{constructor(J=1,Q=1,$=1,Z={}){super(J,Q,Z);this.isRenderTarget3D=!0,this.depth=$,this.texture=new H6(null,J,Q,$),this._setTextureOptions(Z),this.texture.isRenderTargetTexture=!0}}class YK{constructor(J){this.value=J}clone(){return new YK(this.value.clone===void 0?this.value:this.value.clone())}}var uN=0;class jX extends F9{constructor(){super();this.isUniformsGroup=!0,Object.defineProperty(this,"id",{value:uN++}),this.name="",this.usage=35044,this.uniforms=[]}add(J){return this.uniforms.push(J),this}remove(J){let Q=this.uniforms.indexOf(J);if(Q!==-1)this.uniforms.splice(Q,1);return this}setName(J){return this.name=J,this}setUsage(J){return this.usage=J,this}dispose(){this.dispatchEvent({type:"dispose"})}copy(J){this.name=J.name,this.usage=J.usage;let Q=J.uniforms;this.uniforms.length=0;for(let $=0,Z=Q.length;$<Z;$++){let W=Array.isArray(Q[$])?Q[$]:[Q[$]];for(let K=0;K<W.length;K++)this.uniforms.push(W[K].clone())}return this}clone(){return new this.constructor().copy(this)}}class yX extends U6{constructor(J,Q,$=1){super(J,Q);this.isInstancedInterleavedBuffer=!0,this.meshPerAttribute=$}copy(J){return super.copy(J),this.meshPerAttribute=J.meshPerAttribute,this}clone(J){let Q=super.clone(J);return Q.meshPerAttribute=this.meshPerAttribute,Q}toJSON(J){let Q=super.toJSON(J);return Q.isInstancedInterleavedBuffer=!0,Q.meshPerAttribute=this.meshPerAttribute,Q}}class fX{constructor(J,Q,$,Z,W,K=!1){this.isGLBufferAttribute=!0,this.name="",this.buffer=J,this.type=Q,this.itemSize=$,this.elementSize=Z,this.count=W,this.normalized=K,this.version=0}set needsUpdate(J){if(J===!0)this.version++}setBuffer(J){return this.buffer=J,this}setType(J,Q){return this.type=J,this.elementSize=Q,this}setItemSize(J){return this.itemSize=J,this}setCount(J){return this.count=J,this}}var wH=new m0;class bX{constructor(J,Q,$=0,Z=1/0){this.ray=new m9(J,Q),this.near=$,this.far=Z,this.camera=null,this.layers=new Y6,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(J,Q){this.ray.set(J,Q)}setFromCamera(J,Q){if(Q.isPerspectiveCamera)this.ray.origin.setFromMatrixPosition(Q.matrixWorld),this.ray.direction.set(J.x,J.y,0.5).unproject(Q).sub(this.ray.origin).normalize(),this.camera=Q;else if(Q.isOrthographicCamera)this.ray.origin.set(J.x,J.y,(Q.near+Q.far)/(Q.near-Q.far)).unproject(Q),this.ray.direction.set(0,0,-1).transformDirection(Q.matrixWorld),this.camera=Q;else j0("Raycaster: Unsupported camera type: "+Q.type)}setFromXRController(J){return wH.identity().extractRotation(J.matrixWorld),this.ray.origin.setFromMatrixPosition(J.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(wH),this}intersectObject(J,Q=!0,$=[]){return UZ(J,this,$,Q),$.sort(AH),$}intersectObjects(J,Q=!0,$=[]){for(let Z=0,W=J.length;Z<W;Z++)UZ(J[Z],this,$,Q);return $.sort(AH),$}}function AH(J,Q){return J.distance-Q.distance}function UZ(J,Q,$,Z){let W=!0;if(J.layers.test(Q.layers)){if(J.raycast(Q,$)===!1)W=!1}if(W===!0&&Z===!0){let K=J.children;for(let H=0,Y=K.length;H<Y;H++)UZ(K[H],Q,$,!0)}}class vX{constructor(J=!0){this.autoStart=J,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1,q0("THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.")}start(){this.startTime=performance.now(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let J=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){let Q=performance.now();J=(Q-this.oldTime)/1000,this.oldTime=Q,this.elapsedTime+=J}return J}}class R6{constructor(J=1,Q=0,$=0){this.radius=J,this.phi=Q,this.theta=$}set(J,Q,$){return this.radius=J,this.phi=Q,this.theta=$,this}copy(J){return this.radius=J.radius,this.phi=J.phi,this.theta=J.theta,this}makeSafe(){return this.phi=p0(this.phi,0.000001,Math.PI-0.000001),this}setFromVector3(J){return this.setFromCartesianCoords(J.x,J.y,J.z)}setFromCartesianCoords(J,Q,$){if(this.radius=Math.sqrt(J*J+Q*Q+$*$),this.radius===0)this.theta=0,this.phi=0;else this.theta=Math.atan2(J,$),this.phi=Math.acos(p0(Q/this.radius,-1,1));return this}clone(){return new this.constructor().copy(this)}}class hX{constructor(J=1,Q=0,$=0){this.radius=J,this.theta=Q,this.y=$}set(J,Q,$){return this.radius=J,this.theta=Q,this.y=$,this}copy(J){return this.radius=J.radius,this.theta=J.theta,this.y=J.y,this}setFromVector3(J){return this.setFromCartesianCoords(J.x,J.y,J.z)}setFromCartesianCoords(J,Q,$){return this.radius=Math.sqrt(J*J+$*$),this.theta=Math.atan2(J,$),this.y=Q,this}clone(){return new this.constructor().copy(this)}}class XK{constructor(J,Q,$,Z){if(XK.prototype.isMatrix2=!0,this.elements=[1,0,0,1],J!==void 0)this.set(J,Q,$,Z)}identity(){return this.set(1,0,0,1),this}fromArray(J,Q=0){for(let $=0;$<4;$++)this.elements[$]=J[$+Q];return this}set(J,Q,$,Z){let W=this.elements;return W[0]=J,W[2]=Q,W[1]=$,W[3]=Z,this}}var _H=new s;class xX{constructor(J=new s(1/0,1/0),Q=new s(-1/0,-1/0)){this.isBox2=!0,this.min=J,this.max=Q}set(J,Q){return this.min.copy(J),this.max.copy(Q),this}setFromPoints(J){this.makeEmpty();for(let Q=0,$=J.length;Q<$;Q++)this.expandByPoint(J[Q]);return this}setFromCenterAndSize(J,Q){let $=_H.copy(Q).multiplyScalar(0.5);return this.min.copy(J).sub($),this.max.copy(J).add($),this}clone(){return new this.constructor().copy(this)}copy(J){return this.min.copy(J.min),this.max.copy(J.max),this}makeEmpty(){return this.min.x=this.min.y=1/0,this.max.x=this.max.y=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y}getCenter(J){return this.isEmpty()?J.set(0,0):J.addVectors(this.min,this.max).multiplyScalar(0.5)}getSize(J){return this.isEmpty()?J.set(0,0):J.subVectors(this.max,this.min)}expandByPoint(J){return this.min.min(J),this.max.max(J),this}expandByVector(J){return this.min.sub(J),this.max.add(J),this}expandByScalar(J){return this.min.addScalar(-J),this.max.addScalar(J),this}containsPoint(J){return J.x>=this.min.x&&J.x<=this.max.x&&J.y>=this.min.y&&J.y<=this.max.y}containsBox(J){return this.min.x<=J.min.x&&J.max.x<=this.max.x&&this.min.y<=J.min.y&&J.max.y<=this.max.y}getParameter(J,Q){return Q.set((J.x-this.min.x)/(this.max.x-this.min.x),(J.y-this.min.y)/(this.max.y-this.min.y))}intersectsBox(J){return J.max.x>=this.min.x&&J.min.x<=this.max.x&&J.max.y>=this.min.y&&J.min.y<=this.max.y}clampPoint(J,Q){return Q.copy(J).clamp(this.min,this.max)}distanceToPoint(J){return this.clampPoint(J,_H).distanceTo(J)}intersect(J){if(this.min.max(J.min),this.max.min(J.max),this.isEmpty())this.makeEmpty();return this}union(J){return this.min.min(J.min),this.max.max(J.max),this}translate(J){return this.min.add(J),this.max.add(J),this}equals(J){return J.min.equals(this.min)&&J.max.equals(this.max)}}var PH=new _,XQ=new _,U7=new _,G7=new _,$Z=new _,cN=new _,nN=new _;class gX{constructor(J=new _,Q=new _){this.start=J,this.end=Q}set(J,Q){return this.start.copy(J),this.end.copy(Q),this}copy(J){return this.start.copy(J.start),this.end.copy(J.end),this}getCenter(J){return J.addVectors(this.start,this.end).multiplyScalar(0.5)}delta(J){return J.subVectors(this.end,this.start)}distanceSq(){return this.start.distanceToSquared(this.end)}distance(){return this.start.distanceTo(this.end)}at(J,Q){return this.delta(Q).multiplyScalar(J).add(this.start)}closestPointToPointParameter(J,Q){PH.subVectors(J,this.start),XQ.subVectors(this.end,this.start);let $=XQ.dot(XQ),W=XQ.dot(PH)/$;if(Q)W=p0(W,0,1);return W}closestPointToPoint(J,Q,$){let Z=this.closestPointToPointParameter(J,Q);return this.delta($).multiplyScalar(Z).add(this.start)}distanceSqToLine3(J,Q=cN,$=nN){let W,K,H=this.start,Y=J.start,X=this.end,U=J.end;U7.subVectors(X,H),G7.subVectors(U,Y),$Z.subVectors(H,Y);let N=U7.dot(U7),q=G7.dot(G7),G=G7.dot($Z);if(N<=0.00000000000000010000000000000001&&q<=0.00000000000000010000000000000001)return Q.copy(H),$.copy(Y),Q.sub($),Q.dot(Q);if(N<=0.00000000000000010000000000000001)W=0,K=G/q,K=p0(K,0,1);else{let E=U7.dot($Z);if(q<=0.00000000000000010000000000000001)K=0,W=p0(-E/N,0,1);else{let O=U7.dot(G7),R=N*q-O*O;if(R!==0)W=p0((O*G-E*q)/R,0,1);else W=0;if(K=(O*W+G)/q,K<0)K=0,W=p0(-E/N,0,1);else if(K>1)K=1,W=p0((O-E)/N,0,1)}}return Q.copy(H).addScaledVector(U7,W),$.copy(Y).addScaledVector(G7,K),Q.distanceToSquared($)}applyMatrix4(J){return this.start.applyMatrix4(J),this.end.applyMatrix4(J),this}equals(J){return J.start.equals(this.start)&&J.end.equals(this.end)}clone(){return new this.constructor().copy(this)}}var TH=new _;class pX extends $J{constructor(J,Q){super();this.light=J,this.matrixAutoUpdate=!1,this.color=Q,this.type="SpotLightHelper";let $=new u0,Z=[0,0,0,0,0,1,0,0,0,1,0,1,0,0,0,-1,0,1,0,0,0,0,1,1,0,0,0,0,-1,1];for(let K=0,H=1,Y=32;K<Y;K++,H++){let X=K/Y*Math.PI*2,U=H/Y*Math.PI*2;Z.push(Math.cos(X),Math.sin(X),1,Math.cos(U),Math.sin(U),1)}$.setAttribute("position",new B0(Z,3));let W=new xJ({fog:!1,toneMapped:!1});this.cone=new D9($,W),this.add(this.cone),this.update()}dispose(){this.cone.geometry.dispose(),this.cone.material.dispose()}update(){if(this.light.updateWorldMatrix(!0,!1),this.light.target.updateWorldMatrix(!0,!1),this.parent)this.parent.updateWorldMatrix(!0),this.matrix.copy(this.parent.matrixWorld).invert().multiply(this.light.matrixWorld);else this.matrix.copy(this.light.matrixWorld);this.matrixWorld.copy(this.light.matrixWorld);let J=this.light.distance?this.light.distance:1000,Q=J*Math.tan(this.light.angle);if(this.cone.scale.set(Q,Q,J),TH.setFromMatrixPosition(this.light.target.matrixWorld),this.cone.lookAt(TH),this.color!==void 0)this.cone.material.color.set(this.color);else this.cone.material.color.copy(this.light.color)}}var t9=new _,UQ=new m0,ZZ=new m0;class mX extends D9{constructor(J){let Q=dX(J),$=new u0,Z=[],W=[];for(let X=0;X<Q.length;X++){let U=Q[X];if(U.parent&&U.parent.isBone)Z.push(0,0,0),Z.push(0,0,0),W.push(0,0,0),W.push(0,0,0)}$.setAttribute("position",new B0(Z,3)),$.setAttribute("color",new B0(W,3));let K=new xJ({vertexColors:!0,depthTest:!1,depthWrite:!1,toneMapped:!1,transparent:!0});super($,K);this.isSkeletonHelper=!0,this.type="SkeletonHelper",this.root=J,this.bones=Q,this.matrix=J.matrixWorld,this.matrixAutoUpdate=!1;let H=new M0(255),Y=new M0(65280);this.setColors(H,Y)}updateMatrixWorld(J){let Q=this.bones,$=this.geometry,Z=$.getAttribute("position");ZZ.copy(this.root.matrixWorld).invert();for(let W=0,K=0;W<Q.length;W++){let H=Q[W];if(H.parent&&H.parent.isBone)UQ.multiplyMatrices(ZZ,H.matrixWorld),t9.setFromMatrixPosition(UQ),Z.setXYZ(K,t9.x,t9.y,t9.z),UQ.multiplyMatrices(ZZ,H.parent.matrixWorld),t9.setFromMatrixPosition(UQ),Z.setXYZ(K+1,t9.x,t9.y,t9.z),K+=2}$.getAttribute("position").needsUpdate=!0,super.updateMatrixWorld(J)}setColors(J,Q){let Z=this.geometry.getAttribute("color");for(let W=0;W<Z.count;W+=2)Z.setXYZ(W,J.r,J.g,J.b),Z.setXYZ(W+1,Q.r,Q.g,Q.b);return Z.needsUpdate=!0,this}dispose(){this.geometry.dispose(),this.material.dispose()}}function dX(J){let Q=[];if(J.isBone===!0)Q.push(J);for(let $=0;$<J.children.length;$++)Q.push(...dX(J.children[$]));return Q}class lX extends VJ{constructor(J,Q,$){let Z=new D6(Q,4,2),W=new d9({wireframe:!0,fog:!1,toneMapped:!1});super(Z,W);this.light=J,this.color=$,this.type="PointLightHelper",this.matrix=this.light.matrixWorld,this.matrixAutoUpdate=!1,this.update()}dispose(){this.geometry.dispose(),this.material.dispose()}update(){if(this.light.updateWorldMatrix(!0,!1),this.color!==void 0)this.material.color.set(this.color);else this.material.color.copy(this.light.color)}}var sN=new _,SH=new M0,jH=new M0;class uX extends $J{constructor(J,Q,$){super();this.light=J,this.matrix=J.matrixWorld,this.matrixAutoUpdate=!1,this.color=$,this.type="HemisphereLightHelper";let Z=new F6(Q);if(Z.rotateY(Math.PI*0.5),this.material=new d9({wireframe:!0,fog:!1,toneMapped:!1}),this.color===void 0)this.material.vertexColors=!0;let W=Z.getAttribute("position"),K=new Float32Array(W.count*3);Z.setAttribute("color",new HJ(K,3)),this.add(new VJ(Z,this.material)),this.update()}dispose(){this.children[0].geometry.dispose(),this.children[0].material.dispose()}update(){let J=this.children[0];if(this.color!==void 0)this.material.color.set(this.color);else{let Q=J.geometry.getAttribute("color");SH.copy(this.light.color),jH.copy(this.light.groundColor);for(let $=0,Z=Q.count;$<Z;$++){let W=$<Z/2?SH:jH;Q.setXYZ($,W.r,W.g,W.b)}Q.needsUpdate=!0}this.light.updateWorldMatrix(!0,!1),J.lookAt(sN.setFromMatrixPosition(this.light.matrixWorld).negate())}}class cX extends D9{constructor(J=10,Q=10,$=4473924,Z=8947848){$=new M0($),Z=new M0(Z);let W=Q/2,K=J/Q,H=J/2,Y=[],X=[];for(let q=0,G=0,E=-H;q<=Q;q++,E+=K){Y.push(-H,0,E,H,0,E),Y.push(E,0,-H,E,0,H);let O=q===W?$:Z;O.toArray(X,G),G+=3,O.toArray(X,G),G+=3,O.toArray(X,G),G+=3,O.toArray(X,G),G+=3}let U=new u0;U.setAttribute("position",new B0(Y,3)),U.setAttribute("color",new B0(X,3));let N=new xJ({vertexColors:!0,toneMapped:!1});super(U,N);this.type="GridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}}class nX extends D9{constructor(J=10,Q=16,$=8,Z=64,W=4473924,K=8947848){W=new M0(W),K=new M0(K);let H=[],Y=[];if(Q>1)for(let N=0;N<Q;N++){let q=N/Q*(Math.PI*2),G=Math.sin(q)*J,E=Math.cos(q)*J;H.push(0,0,0),H.push(G,0,E);let O=N&1?W:K;Y.push(O.r,O.g,O.b),Y.push(O.r,O.g,O.b)}for(let N=0;N<$;N++){let q=N&1?W:K,G=J-J/$*N;for(let E=0;E<Z;E++){let O=E/Z*(Math.PI*2),R=Math.sin(O)*G,D=Math.cos(O)*G;H.push(R,0,D),Y.push(q.r,q.g,q.b),O=(E+1)/Z*(Math.PI*2),R=Math.sin(O)*G,D=Math.cos(O)*G,H.push(R,0,D),Y.push(q.r,q.g,q.b)}}let X=new u0;X.setAttribute("position",new B0(H,3)),X.setAttribute("color",new B0(Y,3));let U=new xJ({vertexColors:!0,toneMapped:!1});super(X,U);this.type="PolarGridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}}var yH=new _,GQ=new _,fH=new _;class sX extends $J{constructor(J,Q,$){super();if(this.light=J,this.matrix=J.matrixWorld,this.matrixAutoUpdate=!1,this.color=$,this.type="DirectionalLightHelper",Q===void 0)Q=1;let Z=new u0;Z.setAttribute("position",new B0([-Q,Q,0,Q,Q,0,Q,-Q,0,-Q,-Q,0,-Q,Q,0],3));let W=new xJ({fog:!1,toneMapped:!1});this.lightPlane=new x9(Z,W),this.add(this.lightPlane),Z=new u0,Z.setAttribute("position",new B0([0,0,0,0,0,1],3)),this.targetLine=new x9(Z,W),this.add(this.targetLine),this.update()}dispose(){this.lightPlane.geometry.dispose(),this.lightPlane.material.dispose(),this.targetLine.geometry.dispose(),this.targetLine.material.dispose()}update(){if(this.light.updateWorldMatrix(!0,!1),this.light.target.updateWorldMatrix(!0,!1),yH.setFromMatrixPosition(this.light.matrixWorld),GQ.setFromMatrixPosition(this.light.target.matrixWorld),fH.subVectors(GQ,yH),this.lightPlane.lookAt(GQ),this.color!==void 0)this.lightPlane.material.color.set(this.color),this.targetLine.material.color.set(this.color);else this.lightPlane.material.color.copy(this.light.color),this.targetLine.material.color.copy(this.light.color);this.targetLine.lookAt(GQ),this.targetLine.scale.z=fH.length()}}var NQ=new _,RJ=new O6;class iX extends D9{constructor(J){let Q=new u0,$=new xJ({color:16777215,vertexColors:!0,toneMapped:!1}),Z=[],W=[],K={};H("n1","n2"),H("n2","n4"),H("n4","n3"),H("n3","n1"),H("f1","f2"),H("f2","f4"),H("f4","f3"),H("f3","f1"),H("n1","f1"),H("n2","f2"),H("n3","f3"),H("n4","f4"),H("p","n1"),H("p","n2"),H("p","n3"),H("p","n4"),H("u1","u2"),H("u2","u3"),H("u3","u1"),H("c","t"),H("p","c"),H("cn1","cn2"),H("cn3","cn4"),H("cf1","cf2"),H("cf3","cf4");function H(E,O){Y(E),Y(O)}function Y(E){if(Z.push(0,0,0),W.push(0,0,0),K[E]===void 0)K[E]=[];K[E].push(Z.length/3-1)}Q.setAttribute("position",new B0(Z,3)),Q.setAttribute("color",new B0(W,3));super(Q,$);if(this.type="CameraHelper",this.camera=J,this.camera.updateProjectionMatrix)this.camera.updateProjectionMatrix();this.matrix=J.matrixWorld,this.matrixAutoUpdate=!1,this.pointMap=K,this.update();let X=new M0(16755200),U=new M0(16711680),N=new M0(43775),q=new M0(16777215),G=new M0(3355443);this.setColors(X,U,N,q,G)}setColors(J,Q,$,Z,W){let H=this.geometry.getAttribute("color");return H.setXYZ(0,J.r,J.g,J.b),H.setXYZ(1,J.r,J.g,J.b),H.setXYZ(2,J.r,J.g,J.b),H.setXYZ(3,J.r,J.g,J.b),H.setXYZ(4,J.r,J.g,J.b),H.setXYZ(5,J.r,J.g,J.b),H.setXYZ(6,J.r,J.g,J.b),H.setXYZ(7,J.r,J.g,J.b),H.setXYZ(8,J.r,J.g,J.b),H.setXYZ(9,J.r,J.g,J.b),H.setXYZ(10,J.r,J.g,J.b),H.setXYZ(11,J.r,J.g,J.b),H.setXYZ(12,J.r,J.g,J.b),H.setXYZ(13,J.r,J.g,J.b),H.setXYZ(14,J.r,J.g,J.b),H.setXYZ(15,J.r,J.g,J.b),H.setXYZ(16,J.r,J.g,J.b),H.setXYZ(17,J.r,J.g,J.b),H.setXYZ(18,J.r,J.g,J.b),H.setXYZ(19,J.r,J.g,J.b),H.setXYZ(20,J.r,J.g,J.b),H.setXYZ(21,J.r,J.g,J.b),H.setXYZ(22,J.r,J.g,J.b),H.setXYZ(23,J.r,J.g,J.b),H.setXYZ(24,Q.r,Q.g,Q.b),H.setXYZ(25,Q.r,Q.g,Q.b),H.setXYZ(26,Q.r,Q.g,Q.b),H.setXYZ(27,Q.r,Q.g,Q.b),H.setXYZ(28,Q.r,Q.g,Q.b),H.setXYZ(29,Q.r,Q.g,Q.b),H.setXYZ(30,Q.r,Q.g,Q.b),H.setXYZ(31,Q.r,Q.g,Q.b),H.setXYZ(32,$.r,$.g,$.b),H.setXYZ(33,$.r,$.g,$.b),H.setXYZ(34,$.r,$.g,$.b),H.setXYZ(35,$.r,$.g,$.b),H.setXYZ(36,$.r,$.g,$.b),H.setXYZ(37,$.r,$.g,$.b),H.setXYZ(38,Z.r,Z.g,Z.b),H.setXYZ(39,Z.r,Z.g,Z.b),H.setXYZ(40,W.r,W.g,W.b),H.setXYZ(41,W.r,W.g,W.b),H.setXYZ(42,W.r,W.g,W.b),H.setXYZ(43,W.r,W.g,W.b),H.setXYZ(44,W.r,W.g,W.b),H.setXYZ(45,W.r,W.g,W.b),H.setXYZ(46,W.r,W.g,W.b),H.setXYZ(47,W.r,W.g,W.b),H.setXYZ(48,W.r,W.g,W.b),H.setXYZ(49,W.r,W.g,W.b),H.needsUpdate=!0,this}update(){let J=this.geometry,Q=this.pointMap,$=1,Z=1,W,K;if(RJ.projectionMatrixInverse.copy(this.camera.projectionMatrixInverse),this.camera.reversedDepth===!0)W=1,K=0;else if(this.camera.coordinateSystem===2000)W=-1,K=1;else if(this.camera.coordinateSystem===2001)W=0,K=1;else throw Error("THREE.CameraHelper.update(): Invalid coordinate system: "+this.camera.coordinateSystem);LJ("c",Q,J,RJ,0,0,W),LJ("t",Q,J,RJ,0,0,K),LJ("n1",Q,J,RJ,-1,-1,W),LJ("n2",Q,J,RJ,1,-1,W),LJ("n3",Q,J,RJ,-1,1,W),LJ("n4",Q,J,RJ,1,1,W),LJ("f1",Q,J,RJ,-1,-1,K),LJ("f2",Q,J,RJ,1,-1,K),LJ("f3",Q,J,RJ,-1,1,K),LJ("f4",Q,J,RJ,1,1,K),LJ("u1",Q,J,RJ,0.7,1.1,W),LJ("u2",Q,J,RJ,-0.7,1.1,W),LJ("u3",Q,J,RJ,0,2,W),LJ("cf1",Q,J,RJ,-1,0,K),LJ("cf2",Q,J,RJ,1,0,K),LJ("cf3",Q,J,RJ,0,-1,K),LJ("cf4",Q,J,RJ,0,1,K),LJ("cn1",Q,J,RJ,-1,0,W),LJ("cn2",Q,J,RJ,1,0,W),LJ("cn3",Q,J,RJ,0,-1,W),LJ("cn4",Q,J,RJ,0,1,W),J.getAttribute("position").needsUpdate=!0}dispose(){this.geometry.dispose(),this.material.dispose()}}function LJ(J,Q,$,Z,W,K,H){NQ.set(W,K,H).unproject(Z);let Y=Q[J];if(Y!==void 0){let X=$.getAttribute("position");for(let U=0,N=Y.length;U<N;U++)X.setXYZ(Y[U],NQ.x,NQ.y,NQ.z)}}var qQ=new jJ;class oX extends D9{constructor(J,Q=16776960){let $=new Uint16Array([0,1,1,2,2,3,3,0,4,5,5,6,6,7,7,4,0,4,1,5,2,6,3,7]),Z=new Float32Array(24),W=new u0;W.setIndex(new HJ($,1)),W.setAttribute("position",new HJ(Z,3));super(W,new xJ({color:Q,toneMapped:!1}));this.object=J,this.type="BoxHelper",this.matrixAutoUpdate=!1,this.update()}update(){if(this.object!==void 0)qQ.setFromObject(this.object);if(qQ.isEmpty())return;let{min:J,max:Q}=qQ,$=this.geometry.attributes.position,Z=$.array;Z[0]=Q.x,Z[1]=Q.y,Z[2]=Q.z,Z[3]=J.x,Z[4]=Q.y,Z[5]=Q.z,Z[6]=J.x,Z[7]=J.y,Z[8]=Q.z,Z[9]=Q.x,Z[10]=J.y,Z[11]=Q.z,Z[12]=Q.x,Z[13]=Q.y,Z[14]=J.z,Z[15]=J.x,Z[16]=Q.y,Z[17]=J.z,Z[18]=J.x,Z[19]=J.y,Z[20]=J.z,Z[21]=Q.x,Z[22]=J.y,Z[23]=J.z,$.needsUpdate=!0,this.geometry.computeBoundingSphere()}setFromObject(J){return this.object=J,this.update(),this}copy(J,Q){return super.copy(J,Q),this.object=J.object,this}dispose(){this.geometry.dispose(),this.material.dispose()}}class aX extends D9{constructor(J,Q=16776960){let $=new Uint16Array([0,1,1,2,2,3,3,0,4,5,5,6,6,7,7,4,0,4,1,5,2,6,3,7]),Z=[1,1,1,-1,1,1,-1,-1,1,1,-1,1,1,1,-1,-1,1,-1,-1,-1,-1,1,-1,-1],W=new u0;W.setIndex(new HJ($,1)),W.setAttribute("position",new B0(Z,3));super(W,new xJ({color:Q,toneMapped:!1}));this.box=J,this.type="Box3Helper",this.geometry.computeBoundingSphere()}updateMatrixWorld(J){let Q=this.box;if(Q.isEmpty())return;Q.getCenter(this.position),Q.getSize(this.scale),this.scale.multiplyScalar(0.5),super.updateMatrixWorld(J)}dispose(){this.geometry.dispose(),this.material.dispose()}}class rX extends x9{constructor(J,Q=1,$=16776960){let Z=$,W=[1,-1,0,-1,1,0,-1,-1,0,1,1,0,-1,1,0,-1,-1,0,1,-1,0,1,1,0],K=new u0;K.setAttribute("position",new B0(W,3)),K.computeBoundingSphere();super(K,new xJ({color:Z,toneMapped:!1}));this.type="PlaneHelper",this.plane=J,this.size=Q;let H=[1,1,0,-1,1,0,-1,-1,0,1,1,0,-1,-1,0,1,-1,0],Y=new u0;Y.setAttribute("position",new B0(H,3)),Y.computeBoundingSphere(),this.add(new VJ(Y,new d9({color:Z,opacity:0.2,transparent:!0,depthWrite:!1,toneMapped:!1})))}updateMatrixWorld(J){this.position.set(0,0,0),this.scale.set(0.5*this.size,0.5*this.size,1),this.lookAt(this.plane.normal),this.translateZ(-this.plane.constant),super.updateMatrixWorld(J)}dispose(){this.geometry.dispose(),this.material.dispose(),this.children[0].geometry.dispose(),this.children[0].material.dispose()}}var bH=new _,EQ,WZ;class tX extends $J{constructor(J=new _(0,0,1),Q=new _(0,0,0),$=1,Z=16776960,W=$*0.2,K=W*0.2){super();if(this.type="ArrowHelper",EQ===void 0)EQ=new u0,EQ.setAttribute("position",new B0([0,0,0,0,1,0],3)),WZ=new q6(0.5,1,5,1),WZ.translate(0,-0.5,0);this.position.copy(Q),this.line=new x9(EQ,new xJ({color:Z,toneMapped:!1})),this.line.matrixAutoUpdate=!1,this.add(this.line),this.cone=new VJ(WZ,new d9({color:Z,toneMapped:!1})),this.cone.matrixAutoUpdate=!1,this.add(this.cone),this.setDirection(J),this.setLength($,W,K)}setDirection(J){if(J.y>0.99999)this.quaternion.set(0,0,0,1);else if(J.y<-0.99999)this.quaternion.set(1,0,0,0);else{bH.set(J.z,0,-J.x).normalize();let Q=Math.acos(J.y);this.quaternion.setFromAxisAngle(bH,Q)}}setLength(J,Q=J*0.2,$=Q*0.2){this.line.scale.set(1,Math.max(0.0001,J-Q),1),this.line.updateMatrix(),this.cone.scale.set($,Q,$),this.cone.position.y=J,this.cone.updateMatrix()}setColor(J){this.line.material.color.set(J),this.cone.material.color.set(J)}copy(J){return super.copy(J,!1),this.line.copy(J.line),this.cone.copy(J.cone),this}dispose(){this.line.geometry.dispose(),this.line.material.dispose(),this.cone.geometry.dispose(),this.cone.material.dispose()}}class eX extends D9{constructor(J=1){let Q=[0,0,0,J,0,0,0,0,0,0,J,0,0,0,0,0,0,J],$=[1,0,0,1,0.6,0,0,1,0,0.6,1,0,0,0,1,0,0.6,1],Z=new u0;Z.setAttribute("position",new B0(Q,3)),Z.setAttribute("color",new B0($,3));let W=new xJ({vertexColors:!0,toneMapped:!1});super(Z,W);this.type="AxesHelper"}setColors(J,Q,$){let Z=new M0,W=this.geometry.attributes.color.array;return Z.set(J),Z.toArray(W,0),Z.toArray(W,3),Z.set(Q),Z.toArray(W,6),Z.toArray(W,9),Z.set($),Z.toArray(W,12),Z.toArray(W,15),this.geometry.attributes.color.needsUpdate=!0,this}dispose(){this.geometry.dispose(),this.material.dispose()}}class JU{constructor(){this.type="ShapePath",this.color=new M0,this.subPaths=[],this.currentPath=null}moveTo(J,Q){return this.currentPath=new o7,this.subPaths.push(this.currentPath),this.currentPath.moveTo(J,Q),this}lineTo(J,Q){return this.currentPath.lineTo(J,Q),this}quadraticCurveTo(J,Q,$,Z){return this.currentPath.quadraticCurveTo(J,Q,$,Z),this}bezierCurveTo(J,Q,$,Z,W,K){return this.currentPath.bezierCurveTo(J,Q,$,Z,W,K),this}splineThru(J){return this.currentPath.splineThru(J),this}toShapes(J){function Q(D){let F=[];for(let M=0,L=D.length;M<L;M++){let B=D[M],P=new e9;P.curves=B.curves,F.push(P)}return F}function $(D,F){let M=F.length,L=!1;for(let B=M-1,P=0;P<M;B=P++){let C=F[B],w=F[P],k=w.x-C.x,A=w.y-C.y;if(Math.abs(A)>Number.EPSILON){if(A<0)C=F[P],k=-k,w=F[B],A=-A;if(D.y<C.y||D.y>w.y)continue;if(D.y===C.y){if(D.x===C.x)return!0}else{let h=A*(D.x-C.x)-k*(D.y-C.y);if(h===0)return!0;if(h<0)continue;L=!L}}else{if(D.y!==C.y)continue;if(w.x<=D.x&&D.x<=C.x||C.x<=D.x&&D.x<=w.x)return!0}}return L}let Z=N9.isClockWise,W=this.subPaths;if(W.length===0)return[];let K,H,Y,X=[];if(W.length===1)return H=W[0],Y=new e9,Y.curves=H.curves,X.push(Y),X;let U=!Z(W[0].getPoints());U=J?!U:U;let N=[],q=[],G=[],E=0,O;q[E]=void 0,G[E]=[];for(let D=0,F=W.length;D<F;D++)if(H=W[D],O=H.getPoints(),K=Z(O),K=J?!K:K,K){if(!U&&q[E])E++;if(q[E]={s:new e9,p:O},q[E].s.curves=H.curves,U)E++;G[E]=[]}else G[E].push({h:H,p:O[0]});if(!q[0])return Q(W);if(q.length>1){let D=!1,F=0;for(let M=0,L=q.length;M<L;M++)N[M]=[];for(let M=0,L=q.length;M<L;M++){let B=G[M];for(let P=0;P<B.length;P++){let C=B[P],w=!0;for(let k=0;k<q.length;k++)if($(C.p,q[k].p)){if(M!==k)F++;if(w)w=!1,N[k].push(C);else D=!0}if(w)N[M].push(C)}}if(F>0&&D===!1)G=N}let R;for(let D=0,F=q.length;D<F;D++){Y=q[D].s,X.push(Y),R=G[D];for(let M=0,L=R.length;M<L;M++)Y.holes.push(R[M].h)}return X}}class E$ extends F9{constructor(J,Q=null){super();this.object=J,this.domElement=Q,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(J){if(J===void 0){q0("Controls: connect() now requires an element.");return}if(this.domElement!==null)this.disconnect();this.domElement=J}disconnect(){}dispose(){}update(){}}function iN(J,Q){let $=J.image&&J.image.width?J.image.width/J.image.height:1;if($>Q)J.repeat.x=1,J.repeat.y=$/Q,J.offset.x=0,J.offset.y=(1-J.repeat.y)/2;else J.repeat.x=Q/$,J.repeat.y=1,J.offset.x=(1-J.repeat.x)/2,J.offset.y=0;return J}function oN(J,Q){let $=J.image&&J.image.width?J.image.width/J.image.height:1;if($>Q)J.repeat.x=Q/$,J.repeat.y=1,J.offset.x=(1-J.repeat.x)/2,J.offset.y=0;else J.repeat.x=1,J.repeat.y=$/Q,J.offset.x=0,J.offset.y=(1-J.repeat.y)/2;return J}function aN(J){return J.repeat.x=1,J.repeat.y=1,J.offset.x=0,J.offset.y=0,J}function F$(J,Q,$,Z){let W=rN(Z);switch($){case 1021:return J*Q;case 1028:return J*Q/W.components*W.byteLength;case 1029:return J*Q/W.components*W.byteLength;case 1030:return J*Q*2/W.components*W.byteLength;case 1031:return J*Q*2/W.components*W.byteLength;case 1022:return J*Q*3/W.components*W.byteLength;case 1023:return J*Q*4/W.components*W.byteLength;case 1033:return J*Q*4/W.components*W.byteLength;case 33776:case 33777:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*8;case 33778:case 33779:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*16;case 35841:case 35843:return Math.max(J,16)*Math.max(Q,8)/4;case 35840:case 35842:return Math.max(J,8)*Math.max(Q,8)/2;case 36196:case 37492:case 37488:case 37489:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*8;case 37496:case 37490:case 37491:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*16;case 37808:return Math.floor((J+3)/4)*Math.floor((Q+3)/4)*16;case 37809:return Math.floor((J+4)/5)*Math.floor((Q+3)/4)*16;case 37810:return Math.floor((J+4)/5)*Math.floor((Q+4)/5)*16;case 37811:return Math.floor((J+5)/6)*Math.floor((Q+4)/5)*16;case 37812:return Math.floor((J+5)/6)*Math.floor((Q+5)/6)*16;case 37813:return Math.floor((J+7)/8)*Math.floor((Q+4)/5)*16;case 37814:return Math.floor((J+7)/8)*Math.floor((Q+5)/6)*16;case 37815:return Math.floor((J+7)/8)*Math.floor((Q+7)/8)*16;case 37816:return Math.floor((J+9)/10)*Math.floor((Q+4)/5)*16;case 37817:return Math.floor((J+9)/10)*Math.floor((Q+5)/6)*16;case 37818:return Math.floor((J+9)/10)*Math.floor((Q+7)/8)*16;case 37819:return Math.floor((J+9)/10)*Math.floor((Q+9)/10)*16;case 37820:return Math.floor((J+11)/12)*Math.floor((Q+9)/10)*16;case 37821:return Math.floor((J+11)/12)*Math.floor((Q+11)/12)*16;case 36492:case 36494:case 36495:return Math.ceil(J/4)*Math.ceil(Q/4)*16;case 36283:case 36284:return Math.ceil(J/4)*Math.ceil(Q/4)*8;case 36285:case 36286:return Math.ceil(J/4)*Math.ceil(Q/4)*16}throw Error(`Unable to determine texture byte length for ${$} format.`)}function rN(J){switch(J){case 1009:case 1010:return{byteLength:1,components:1};case 1012:case 1011:case 1016:return{byteLength:2,components:1};case 1017:case 1018:return{byteLength:2,components:4};case 1014:case 1013:case 1015:return{byteLength:4,components:1};case 35902:case 35899:return{byteLength:4,components:3}}throw Error(`Unknown texture type ${J}.`)}class QU{static contain(J,Q){return iN(J,Q)}static cover(J,Q){return oN(J,Q)}static fill(J){return aN(J)}static getByteLength(J,Q,$,Z){return F$(J,Q,$,Z)}}if(typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"183"}}));if(typeof window<"u")if(window.__THREE__)q0("WARNING: Multiple instances of Three.js being imported.");else window.__THREE__="183";function IU(){let J=null,Q=!1,$=null,Z=null;function W(K,H){$(K,H),Z=J.requestAnimationFrame(W)}return{start:function(){if(Q===!0)return;if($===null)return;Z=J.requestAnimationFrame(W),Q=!0},stop:function(){J.cancelAnimationFrame(Z),Q=!1},setAnimationLoop:function(K){$=K},setContext:function(K){J=K}}}function tN(J){let Q=new WeakMap;function $(Y,X){let{array:U,usage:N}=Y,q=U.byteLength,G=J.createBuffer();J.bindBuffer(X,G),J.bufferData(X,U,N),Y.onUploadCallback();let E;if(U instanceof Float32Array)E=J.FLOAT;else if(typeof Float16Array<"u"&&U instanceof Float16Array)E=J.HALF_FLOAT;else if(U instanceof Uint16Array)if(Y.isFloat16BufferAttribute)E=J.HALF_FLOAT;else E=J.UNSIGNED_SHORT;else if(U instanceof Int16Array)E=J.SHORT;else if(U instanceof Uint32Array)E=J.UNSIGNED_INT;else if(U instanceof Int32Array)E=J.INT;else if(U instanceof Int8Array)E=J.BYTE;else if(U instanceof Uint8Array)E=J.UNSIGNED_BYTE;else if(U instanceof Uint8ClampedArray)E=J.UNSIGNED_BYTE;else throw Error("THREE.WebGLAttributes: Unsupported buffer data format: "+U);return{buffer:G,type:E,bytesPerElement:U.BYTES_PER_ELEMENT,version:Y.version,size:q}}function Z(Y,X,U){let{array:N,updateRanges:q}=X;if(J.bindBuffer(U,Y),q.length===0)J.bufferSubData(U,0,N);else{q.sort((E,O)=>E.start-O.start);let G=0;for(let E=1;E<q.length;E++){let O=q[G],R=q[E];if(R.start<=O.start+O.count+1)O.count=Math.max(O.count,R.start+R.count-O.start);else++G,q[G]=R}q.length=G+1;for(let E=0,O=q.length;E<O;E++){let R=q[E];J.bufferSubData(U,R.start*N.BYTES_PER_ELEMENT,N,R.start,R.count)}X.clearUpdateRanges()}X.onUploadCallback()}function W(Y){if(Y.isInterleavedBufferAttribute)Y=Y.data;return Q.get(Y)}function K(Y){if(Y.isInterleavedBufferAttribute)Y=Y.data;let X=Q.get(Y);if(X)J.deleteBuffer(X.buffer),Q.delete(Y)}function H(Y,X){if(Y.isInterleavedBufferAttribute)Y=Y.data;if(Y.isGLBufferAttribute){let N=Q.get(Y);if(!N||N.version<Y.version)Q.set(Y,{buffer:Y.buffer,type:Y.type,bytesPerElement:Y.elementSize,version:Y.version});return}let U=Q.get(Y);if(U===void 0)Q.set(Y,$(Y,X));else if(U.version<Y.version){if(U.size!==Y.array.byteLength)throw Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");Z(U.buffer,Y,X),U.version=Y.version}}return{get:W,remove:K,update:H}}var eN=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Jq=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Qq=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,$q=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Zq=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Wq=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Kq=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Hq=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Yq=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,Xq=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Uq=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Gq=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Nq=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,qq=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Eq=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Fq=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Dq=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Oq=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Rq=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,kq=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,Mq=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,Lq=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Vq=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,Bq=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,zq=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Iq=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Cq=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,wq=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Aq=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,_q=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Pq="gl_FragColor = linearToOutputTexel( gl_FragColor );",Tq=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Sq=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,jq=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,yq=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,fq=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,bq=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,vq=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,hq=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,xq=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,gq=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,pq=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,mq=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,dq=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lq=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,uq=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,cq=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,nq=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,sq=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,iq=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,oq=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,aq=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,rq=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return v;
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,tq=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,eq=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,JE=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,QE=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,$E=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,ZE=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,WE=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,KE=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,HE=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,YE=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,XE=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,UE=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,GE=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,NE=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,qE=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,EE=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,FE=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,DE=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,OE=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,RE=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,kE=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,ME=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,LE=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,VE=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,BE=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,zE=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,IE=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,CE=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,wE=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,AE=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,_E=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,PE=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,TE=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,SE=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,jE=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,yE=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,fE=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,bE=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,vE=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,hE=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,xE=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,gE=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,pE=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,mE=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,dE=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,lE=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,uE=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,cE=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,nE=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,sE=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,iE=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,oE=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,aE=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,rE=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,tE=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,eE=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,JF=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,QF=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,$F=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,ZF=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,WF=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,KF=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,HF=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,YF=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,XF=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,UF=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,GF=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,NF=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,qF=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,EF=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,FF=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,DF=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,OF=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,RF=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,kF=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,MF=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,LF=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,VF=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,BF=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,zF=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,IF=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,CF=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,wF=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,AF=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,_F=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,PF=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,TF=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,SF=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,a0={alphahash_fragment:eN,alphahash_pars_fragment:Jq,alphamap_fragment:Qq,alphamap_pars_fragment:$q,alphatest_fragment:Zq,alphatest_pars_fragment:Wq,aomap_fragment:Kq,aomap_pars_fragment:Hq,batching_pars_vertex:Yq,batching_vertex:Xq,begin_vertex:Uq,beginnormal_vertex:Gq,bsdfs:Nq,iridescence_fragment:qq,bumpmap_pars_fragment:Eq,clipping_planes_fragment:Fq,clipping_planes_pars_fragment:Dq,clipping_planes_pars_vertex:Oq,clipping_planes_vertex:Rq,color_fragment:kq,color_pars_fragment:Mq,color_pars_vertex:Lq,color_vertex:Vq,common:Bq,cube_uv_reflection_fragment:zq,defaultnormal_vertex:Iq,displacementmap_pars_vertex:Cq,displacementmap_vertex:wq,emissivemap_fragment:Aq,emissivemap_pars_fragment:_q,colorspace_fragment:Pq,colorspace_pars_fragment:Tq,envmap_fragment:Sq,envmap_common_pars_fragment:jq,envmap_pars_fragment:yq,envmap_pars_vertex:fq,envmap_physical_pars_fragment:cq,envmap_vertex:bq,fog_vertex:vq,fog_pars_vertex:hq,fog_fragment:xq,fog_pars_fragment:gq,gradientmap_pars_fragment:pq,lightmap_pars_fragment:mq,lights_lambert_fragment:dq,lights_lambert_pars_fragment:lq,lights_pars_begin:uq,lights_toon_fragment:nq,lights_toon_pars_fragment:sq,lights_phong_fragment:iq,lights_phong_pars_fragment:oq,lights_physical_fragment:aq,lights_physical_pars_fragment:rq,lights_fragment_begin:tq,lights_fragment_maps:eq,lights_fragment_end:JE,logdepthbuf_fragment:QE,logdepthbuf_pars_fragment:$E,logdepthbuf_pars_vertex:ZE,logdepthbuf_vertex:WE,map_fragment:KE,map_pars_fragment:HE,map_particle_fragment:YE,map_particle_pars_fragment:XE,metalnessmap_fragment:UE,metalnessmap_pars_fragment:GE,morphinstance_vertex:NE,morphcolor_vertex:qE,morphnormal_vertex:EE,morphtarget_pars_vertex:FE,morphtarget_vertex:DE,normal_fragment_begin:OE,normal_fragment_maps:RE,normal_pars_fragment:kE,normal_pars_vertex:ME,normal_vertex:LE,normalmap_pars_fragment:VE,clearcoat_normal_fragment_begin:BE,clearcoat_normal_fragment_maps:zE,clearcoat_pars_fragment:IE,iridescence_pars_fragment:CE,opaque_fragment:wE,packing:AE,premultiplied_alpha_fragment:_E,project_vertex:PE,dithering_fragment:TE,dithering_pars_fragment:SE,roughnessmap_fragment:jE,roughnessmap_pars_fragment:yE,shadowmap_pars_fragment:fE,shadowmap_pars_vertex:bE,shadowmap_vertex:vE,shadowmask_pars_fragment:hE,skinbase_vertex:xE,skinning_pars_vertex:gE,skinning_vertex:pE,skinnormal_vertex:mE,specularmap_fragment:dE,specularmap_pars_fragment:lE,tonemapping_fragment:uE,tonemapping_pars_fragment:cE,transmission_fragment:nE,transmission_pars_fragment:sE,uv_pars_fragment:iE,uv_pars_vertex:oE,uv_vertex:aE,worldpos_vertex:rE,background_vert:tE,background_frag:eE,backgroundCube_vert:JF,backgroundCube_frag:QF,cube_vert:$F,cube_frag:ZF,depth_vert:WF,depth_frag:KF,distance_vert:HF,distance_frag:YF,equirect_vert:XF,equirect_frag:UF,linedashed_vert:GF,linedashed_frag:NF,meshbasic_vert:qF,meshbasic_frag:EF,meshlambert_vert:FF,meshlambert_frag:DF,meshmatcap_vert:OF,meshmatcap_frag:RF,meshnormal_vert:kF,meshnormal_frag:MF,meshphong_vert:LF,meshphong_frag:VF,meshphysical_vert:BF,meshphysical_frag:zF,meshtoon_vert:IF,meshtoon_frag:CF,points_vert:wF,points_frag:AF,shadow_vert:_F,shadow_frag:PF,sprite_vert:TF,sprite_frag:SF},D0={common:{diffuse:{value:new M0(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new n0},alphaMap:{value:null},alphaMapTransform:{value:new n0},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new n0}},envmap:{envMap:{value:null},envMapRotation:{value:new n0},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:0.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new n0}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new n0}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new n0},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new n0},normalScale:{value:new s(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new n0},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new n0}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new n0}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new n0}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:0.00025},fogNear:{value:1},fogFar:{value:2000},fogColor:{value:new M0(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new M0(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new n0},alphaTest:{value:0},uvTransform:{value:new n0}},sprite:{diffuse:{value:new M0(16777215)},opacity:{value:1},center:{value:new s(0.5,0.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new n0},alphaMap:{value:null},alphaMapTransform:{value:new n0},alphaTest:{value:0}}},A9={basic:{uniforms:gJ([D0.common,D0.specularmap,D0.envmap,D0.aomap,D0.lightmap,D0.fog]),vertexShader:a0.meshbasic_vert,fragmentShader:a0.meshbasic_frag},lambert:{uniforms:gJ([D0.common,D0.specularmap,D0.envmap,D0.aomap,D0.lightmap,D0.emissivemap,D0.bumpmap,D0.normalmap,D0.displacementmap,D0.fog,D0.lights,{emissive:{value:new M0(0)},envMapIntensity:{value:1}}]),vertexShader:a0.meshlambert_vert,fragmentShader:a0.meshlambert_frag},phong:{uniforms:gJ([D0.common,D0.specularmap,D0.envmap,D0.aomap,D0.lightmap,D0.emissivemap,D0.bumpmap,D0.normalmap,D0.displacementmap,D0.fog,D0.lights,{emissive:{value:new M0(0)},specular:{value:new M0(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:a0.meshphong_vert,fragmentShader:a0.meshphong_frag},standard:{uniforms:gJ([D0.common,D0.envmap,D0.aomap,D0.lightmap,D0.emissivemap,D0.bumpmap,D0.normalmap,D0.displacementmap,D0.roughnessmap,D0.metalnessmap,D0.fog,D0.lights,{emissive:{value:new M0(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:a0.meshphysical_vert,fragmentShader:a0.meshphysical_frag},toon:{uniforms:gJ([D0.common,D0.aomap,D0.lightmap,D0.emissivemap,D0.bumpmap,D0.normalmap,D0.displacementmap,D0.gradientmap,D0.fog,D0.lights,{emissive:{value:new M0(0)}}]),vertexShader:a0.meshtoon_vert,fragmentShader:a0.meshtoon_frag},matcap:{uniforms:gJ([D0.common,D0.bumpmap,D0.normalmap,D0.displacementmap,D0.fog,{matcap:{value:null}}]),vertexShader:a0.meshmatcap_vert,fragmentShader:a0.meshmatcap_frag},points:{uniforms:gJ([D0.points,D0.fog]),vertexShader:a0.points_vert,fragmentShader:a0.points_frag},dashed:{uniforms:gJ([D0.common,D0.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:a0.linedashed_vert,fragmentShader:a0.linedashed_frag},depth:{uniforms:gJ([D0.common,D0.displacementmap]),vertexShader:a0.depth_vert,fragmentShader:a0.depth_frag},normal:{uniforms:gJ([D0.common,D0.bumpmap,D0.normalmap,D0.displacementmap,{opacity:{value:1}}]),vertexShader:a0.meshnormal_vert,fragmentShader:a0.meshnormal_frag},sprite:{uniforms:gJ([D0.sprite,D0.fog]),vertexShader:a0.sprite_vert,fragmentShader:a0.sprite_frag},background:{uniforms:{uvTransform:{value:new n0},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:a0.background_vert,fragmentShader:a0.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new n0}},vertexShader:a0.backgroundCube_vert,fragmentShader:a0.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:a0.cube_vert,fragmentShader:a0.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:a0.equirect_vert,fragmentShader:a0.equirect_frag},distance:{uniforms:gJ([D0.common,D0.displacementmap,{referencePosition:{value:new _},nearDistance:{value:1},farDistance:{value:1000}}]),vertexShader:a0.distance_vert,fragmentShader:a0.distance_frag},shadow:{uniforms:gJ([D0.lights,D0.fog,{color:{value:new M0(0)},opacity:{value:1}}]),vertexShader:a0.shadow_vert,fragmentShader:a0.shadow_frag}};A9.physical={uniforms:gJ([A9.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new n0},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new n0},clearcoatNormalScale:{value:new s(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new n0},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new n0},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new n0},sheen:{value:0},sheenColor:{value:new M0(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new n0},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new n0},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new n0},transmissionSamplerSize:{value:new s},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new n0},attenuationDistance:{value:0},attenuationColor:{value:new M0(0)},specularColor:{value:new M0(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new n0},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new n0},anisotropyVector:{value:new s},anisotropyMap:{value:null},anisotropyMapTransform:{value:new n0}}]),vertexShader:a0.meshphysical_vert,fragmentShader:a0.meshphysical_frag};var D$={r:0,b:0,g:0},p8=new J9,jF=new m0;function yF(J,Q,$,Z,W,K){let H=new M0(0),Y=W===!0?0:1,X,U,N=null,q=0,G=null;function E(M){let L=M.isScene===!0?M.background:null;if(L&&L.isTexture){let B=M.backgroundBlurriness>0;L=Q.get(L,B)}return L}function O(M){let L=!1,B=E(M);if(B===null)D(H,Y);else if(B&&B.isColor)D(B,1),L=!0;let P=J.xr.getEnvironmentBlendMode();if(P==="additive")$.buffers.color.setClear(0,0,0,1,K);else if(P==="alpha-blend")$.buffers.color.setClear(0,0,0,0,K);if(J.autoClear||L)$.buffers.depth.setTest(!0),$.buffers.depth.setMask(!0),$.buffers.color.setMask(!0),J.clear(J.autoClearColor,J.autoClearDepth,J.autoClearStencil)}function R(M,L){let B=E(L);if(B&&(B.isCubeTexture||B.mapping===Q6)){if(U===void 0)U=new VJ(new h8(1,1,1),new Q9({name:"BackgroundCubeMaterial",uniforms:x8(A9.backgroundCube.uniforms),vertexShader:A9.backgroundCube.vertexShader,fragmentShader:A9.backgroundCube.fragmentShader,side:nJ,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),U.geometry.deleteAttribute("normal"),U.geometry.deleteAttribute("uv"),U.onBeforeRender=function(P,C,w){this.matrixWorld.copyPosition(w.matrixWorld)},Object.defineProperty(U.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),Z.update(U);if(p8.copy(L.backgroundRotation),p8.x*=-1,p8.y*=-1,p8.z*=-1,B.isCubeTexture&&B.isRenderTargetTexture===!1)p8.y*=-1,p8.z*=-1;if(U.material.uniforms.envMap.value=B,U.material.uniforms.flipEnvMap.value=B.isCubeTexture&&B.isRenderTargetTexture===!1?-1:1,U.material.uniforms.backgroundBlurriness.value=L.backgroundBlurriness,U.material.uniforms.backgroundIntensity.value=L.backgroundIntensity,U.material.uniforms.backgroundRotation.value.setFromMatrix4(jF.makeRotationFromEuler(p8)),U.material.toneMapped=JJ.getTransfer(B.colorSpace)!==EJ,N!==B||q!==B.version||G!==J.toneMapping)U.material.needsUpdate=!0,N=B,q=B.version,G=J.toneMapping;U.layers.enableAll(),M.unshift(U,U.geometry,U.material,0,0,null)}else if(B&&B.isTexture){if(X===void 0)X=new VJ(new w7(2,2),new Q9({name:"BackgroundMaterial",uniforms:x8(A9.background.uniforms),vertexShader:A9.background.vertexShader,fragmentShader:A9.background.fragmentShader,side:L7,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),X.geometry.deleteAttribute("normal"),Object.defineProperty(X.material,"map",{get:function(){return this.uniforms.t2D.value}}),Z.update(X);if(X.material.uniforms.t2D.value=B,X.material.uniforms.backgroundIntensity.value=L.backgroundIntensity,X.material.toneMapped=JJ.getTransfer(B.colorSpace)!==EJ,B.matrixAutoUpdate===!0)B.updateMatrix();if(X.material.uniforms.uvTransform.value.copy(B.matrix),N!==B||q!==B.version||G!==J.toneMapping)X.material.needsUpdate=!0,N=B,q=B.version,G=J.toneMapping;X.layers.enableAll(),M.unshift(X,X.geometry,X.material,0,0,null)}}function D(M,L){M.getRGB(D$,SW(J)),$.buffers.color.setClear(D$.r,D$.g,D$.b,L,K)}function F(){if(U!==void 0)U.geometry.dispose(),U.material.dispose(),U=void 0;if(X!==void 0)X.geometry.dispose(),X.material.dispose(),X=void 0}return{getClearColor:function(){return H},setClearColor:function(M,L=1){H.set(M),Y=L,D(H,Y)},getClearAlpha:function(){return Y},setClearAlpha:function(M){Y=M,D(H,Y)},render:O,addToRenderList:R,dispose:F}}function fF(J,Q){let $=J.getParameter(J.MAX_VERTEX_ATTRIBS),Z={},W=G(null),K=W,H=!1;function Y(S,v,l,f,c){let x=!1,m=q(S,f,l,v);if(K!==m)K=m,U(K.object);if(x=E(S,f,l,c),x)O(S,f,l,c);if(c!==null)Q.update(c,J.ELEMENT_ARRAY_BUFFER);if(x||H){if(H=!1,B(S,v,l,f),c!==null)J.bindBuffer(J.ELEMENT_ARRAY_BUFFER,Q.get(c).buffer)}}function X(){return J.createVertexArray()}function U(S){return J.bindVertexArray(S)}function N(S){return J.deleteVertexArray(S)}function q(S,v,l,f){let c=f.wireframe===!0,x=Z[v.id];if(x===void 0)x={},Z[v.id]=x;let m=S.isInstancedMesh===!0?S.id:0,Q0=x[m];if(Q0===void 0)Q0={},x[m]=Q0;let $0=Q0[l.id];if($0===void 0)$0={},Q0[l.id]=$0;let U0=$0[c];if(U0===void 0)U0=G(X()),$0[c]=U0;return U0}function G(S){let v=[],l=[],f=[];for(let c=0;c<$;c++)v[c]=0,l[c]=0,f[c]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:v,enabledAttributes:l,attributeDivisors:f,object:S,attributes:{},index:null}}function E(S,v,l,f){let c=K.attributes,x=v.attributes,m=0,Q0=l.getAttributes();for(let $0 in Q0)if(Q0[$0].location>=0){let _0=c[$0],K0=x[$0];if(K0===void 0){if($0==="instanceMatrix"&&S.instanceMatrix)K0=S.instanceMatrix;if($0==="instanceColor"&&S.instanceColor)K0=S.instanceColor}if(_0===void 0)return!0;if(_0.attribute!==K0)return!0;if(K0&&_0.data!==K0.data)return!0;m++}if(K.attributesNum!==m)return!0;if(K.index!==f)return!0;return!1}function O(S,v,l,f){let c={},x=v.attributes,m=0,Q0=l.getAttributes();for(let $0 in Q0)if(Q0[$0].location>=0){let _0=x[$0];if(_0===void 0){if($0==="instanceMatrix"&&S.instanceMatrix)_0=S.instanceMatrix;if($0==="instanceColor"&&S.instanceColor)_0=S.instanceColor}let K0={};if(K0.attribute=_0,_0&&_0.data)K0.data=_0.data;c[$0]=K0,m++}K.attributes=c,K.attributesNum=m,K.index=f}function R(){let S=K.newAttributes;for(let v=0,l=S.length;v<l;v++)S[v]=0}function D(S){F(S,0)}function F(S,v){let{newAttributes:l,enabledAttributes:f,attributeDivisors:c}=K;if(l[S]=1,f[S]===0)J.enableVertexAttribArray(S),f[S]=1;if(c[S]!==v)J.vertexAttribDivisor(S,v),c[S]=v}function M(){let{newAttributes:S,enabledAttributes:v}=K;for(let l=0,f=v.length;l<f;l++)if(v[l]!==S[l])J.disableVertexAttribArray(l),v[l]=0}function L(S,v,l,f,c,x,m){if(m===!0)J.vertexAttribIPointer(S,v,l,c,x);else J.vertexAttribPointer(S,v,l,f,c,x)}function B(S,v,l,f){R();let c=f.attributes,x=l.getAttributes(),m=v.defaultAttributeValues;for(let Q0 in x){let $0=x[Q0];if($0.location>=0){let U0=c[Q0];if(U0===void 0){if(Q0==="instanceMatrix"&&S.instanceMatrix)U0=S.instanceMatrix;if(Q0==="instanceColor"&&S.instanceColor)U0=S.instanceColor}if(U0!==void 0){let{normalized:_0,itemSize:K0}=U0,KJ=Q.get(U0);if(KJ===void 0)continue;let{buffer:WJ,type:i,bytesPerElement:G0}=KJ,V0=i===J.INT||i===J.UNSIGNED_INT||U0.gpuType===BZ;if(U0.isInterleavedBufferAttribute){let E0=U0.data,b0=E0.stride,e0=U0.offset;if(E0.isInstancedInterleavedBuffer){for(let c0=0;c0<$0.locationSize;c0++)F($0.location+c0,E0.meshPerAttribute);if(S.isInstancedMesh!==!0&&f._maxInstanceCount===void 0)f._maxInstanceCount=E0.meshPerAttribute*E0.count}else for(let c0=0;c0<$0.locationSize;c0++)D($0.location+c0);J.bindBuffer(J.ARRAY_BUFFER,WJ);for(let c0=0;c0<$0.locationSize;c0++)L($0.location+c0,K0/$0.locationSize,i,_0,b0*G0,(e0+K0/$0.locationSize*c0)*G0,V0)}else{if(U0.isInstancedBufferAttribute){for(let E0=0;E0<$0.locationSize;E0++)F($0.location+E0,U0.meshPerAttribute);if(S.isInstancedMesh!==!0&&f._maxInstanceCount===void 0)f._maxInstanceCount=U0.meshPerAttribute*U0.count}else for(let E0=0;E0<$0.locationSize;E0++)D($0.location+E0);J.bindBuffer(J.ARRAY_BUFFER,WJ);for(let E0=0;E0<$0.locationSize;E0++)L($0.location+E0,K0/$0.locationSize,i,_0,K0*G0,K0/$0.locationSize*E0*G0,V0)}}else if(m!==void 0){let _0=m[Q0];if(_0!==void 0)switch(_0.length){case 2:J.vertexAttrib2fv($0.location,_0);break;case 3:J.vertexAttrib3fv($0.location,_0);break;case 4:J.vertexAttrib4fv($0.location,_0);break;default:J.vertexAttrib1fv($0.location,_0)}}}}M()}function P(){A();for(let S in Z){let v=Z[S];for(let l in v){let f=v[l];for(let c in f){let x=f[c];for(let m in x)N(x[m].object),delete x[m];delete f[c]}}delete Z[S]}}function C(S){if(Z[S.id]===void 0)return;let v=Z[S.id];for(let l in v){let f=v[l];for(let c in f){let x=f[c];for(let m in x)N(x[m].object),delete x[m];delete f[c]}}delete Z[S.id]}function w(S){for(let v in Z){let l=Z[v];for(let f in l){let c=l[f];if(c[S.id]===void 0)continue;let x=c[S.id];for(let m in x)N(x[m].object),delete x[m];delete c[S.id]}}}function k(S){for(let v in Z){let l=Z[v],f=S.isInstancedMesh===!0?S.id:0,c=l[f];if(c===void 0)continue;for(let x in c){let m=c[x];for(let Q0 in m)N(m[Q0].object),delete m[Q0];delete c[x]}if(delete l[f],Object.keys(l).length===0)delete Z[v]}}function A(){if(h(),H=!0,K===W)return;K=W,U(K.object)}function h(){W.geometry=null,W.program=null,W.wireframe=!1}return{setup:Y,reset:A,resetDefaultState:h,dispose:P,releaseStatesOfGeometry:C,releaseStatesOfObject:k,releaseStatesOfProgram:w,initAttributes:R,enableAttribute:D,disableUnusedAttributes:M}}function bF(J,Q,$){let Z;function W(U){Z=U}function K(U,N){J.drawArrays(Z,U,N),$.update(N,Z,1)}function H(U,N,q){if(q===0)return;J.drawArraysInstanced(Z,U,N,q),$.update(N,Z,q)}function Y(U,N,q){if(q===0)return;Q.get("WEBGL_multi_draw").multiDrawArraysWEBGL(Z,U,0,N,0,q);let E=0;for(let O=0;O<q;O++)E+=N[O];$.update(E,Z,1)}function X(U,N,q,G){if(q===0)return;let E=Q.get("WEBGL_multi_draw");if(E===null)for(let O=0;O<U.length;O++)H(U[O],N[O],G[O]);else{E.multiDrawArraysInstancedWEBGL(Z,U,0,N,0,G,0,q);let O=0;for(let R=0;R<q;R++)O+=N[R]*G[R];$.update(O,Z,1)}}this.setMode=W,this.render=K,this.renderInstances=H,this.renderMultiDraw=Y,this.renderMultiDrawInstances=X}function vF(J,Q,$,Z){let W;function K(){if(W!==void 0)return W;if(Q.has("EXT_texture_filter_anisotropic")===!0){let w=Q.get("EXT_texture_filter_anisotropic");W=J.getParameter(w.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else W=0;return W}function H(w){if(w!==C9&&Z.convert(w)!==J.getParameter(J.IMPLEMENTATION_COLOR_READ_FORMAT))return!1;return!0}function Y(w){let k=w===p9&&(Q.has("EXT_color_buffer_half_float")||Q.has("EXT_color_buffer_float"));if(w!==E9&&Z.convert(w)!==J.getParameter(J.IMPLEMENTATION_COLOR_READ_TYPE)&&w!==g9&&!k)return!1;return!0}function X(w){if(w==="highp"){if(J.getShaderPrecisionFormat(J.VERTEX_SHADER,J.HIGH_FLOAT).precision>0&&J.getShaderPrecisionFormat(J.FRAGMENT_SHADER,J.HIGH_FLOAT).precision>0)return"highp";w="mediump"}if(w==="mediump"){if(J.getShaderPrecisionFormat(J.VERTEX_SHADER,J.MEDIUM_FLOAT).precision>0&&J.getShaderPrecisionFormat(J.FRAGMENT_SHADER,J.MEDIUM_FLOAT).precision>0)return"mediump"}return"lowp"}let U=$.precision!==void 0?$.precision:"highp",N=X(U);if(N!==U)q0("WebGLRenderer:",U,"not supported, using",N,"instead."),U=N;let q=$.logarithmicDepthBuffer===!0,G=$.reversedDepthBuffer===!0&&Q.has("EXT_clip_control"),E=J.getParameter(J.MAX_TEXTURE_IMAGE_UNITS),O=J.getParameter(J.MAX_VERTEX_TEXTURE_IMAGE_UNITS),R=J.getParameter(J.MAX_TEXTURE_SIZE),D=J.getParameter(J.MAX_CUBE_MAP_TEXTURE_SIZE),F=J.getParameter(J.MAX_VERTEX_ATTRIBS),M=J.getParameter(J.MAX_VERTEX_UNIFORM_VECTORS),L=J.getParameter(J.MAX_VARYING_VECTORS),B=J.getParameter(J.MAX_FRAGMENT_UNIFORM_VECTORS),P=J.getParameter(J.MAX_SAMPLES),C=J.getParameter(J.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:K,getMaxPrecision:X,textureFormatReadable:H,textureTypeReadable:Y,precision:U,logarithmicDepthBuffer:q,reversedDepthBuffer:G,maxTextures:E,maxVertexTextures:O,maxTextureSize:R,maxCubemapSize:D,maxAttributes:F,maxVertexUniforms:M,maxVaryings:L,maxFragmentUniforms:B,maxSamples:P,samples:C}}function hF(J){let Q=this,$=null,Z=0,W=!1,K=!1,H=new G9,Y=new n0,X={value:null,needsUpdate:!1};this.uniform=X,this.numPlanes=0,this.numIntersection=0,this.init=function(q,G){let E=q.length!==0||G||Z!==0||W;return W=G,Z=q.length,E},this.beginShadows=function(){K=!0,N(null)},this.endShadows=function(){K=!1},this.setGlobalState=function(q,G){$=N(q,G,0)},this.setState=function(q,G,E){let{clippingPlanes:O,clipIntersection:R,clipShadows:D}=q,F=J.get(q);if(!W||O===null||O.length===0||K&&!D)if(K)N(null);else U();else{let M=K?0:Z,L=M*4,B=F.clippingState||null;X.value=B,B=N(O,G,L,E);for(let P=0;P!==L;++P)B[P]=$[P];F.clippingState=B,this.numIntersection=R?this.numPlanes:0,this.numPlanes+=M}};function U(){if(X.value!==$)X.value=$,X.needsUpdate=Z>0;Q.numPlanes=Z,Q.numIntersection=0}function N(q,G,E,O){let R=q!==null?q.length:0,D=null;if(R!==0){if(D=X.value,O!==!0||D===null){let F=E+R*4,M=G.matrixWorldInverse;if(Y.getNormalMatrix(M),D===null||D.length<F)D=new Float32Array(F);for(let L=0,B=E;L!==R;++L,B+=4)H.copy(q[L]).applyMatrix4(M,Y),H.normal.toArray(D,B),D[B+3]=H.constant}X.value=D,X.needsUpdate=!0}return Q.numPlanes=R,Q.numIntersection=0,D}}var X8=4,$U=[0.125,0.215,0.35,0.446,0.526,0.582],d8=20,xF=256,k6=new _7,ZU=new M0,UK=null,GK=0,NK=0,qK=!1,gF=new _;class DK{constructor(J){this._renderer=J,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(J,Q=0,$=0.1,Z=100,W={}){let{size:K=256,position:H=gF}=W;UK=this._renderer.getRenderTarget(),GK=this._renderer.getActiveCubeFace(),NK=this._renderer.getActiveMipmapLevel(),qK=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(K);let Y=this._allocateTargets();if(Y.depthBuffer=!0,this._sceneToCubeUV(J,$,Z,Y,H),Q>0)this._blur(Y,0,0,Q);return this._applyPMREM(Y),this._cleanup(Y),Y}fromEquirectangular(J,Q=null){return this._fromTexture(J,Q)}fromCubemap(J,Q=null){return this._fromTexture(J,Q)}compileCubemapShader(){if(this._cubemapMaterial===null)this._cubemapMaterial=HU(),this._compileMaterial(this._cubemapMaterial)}compileEquirectangularShader(){if(this._equirectMaterial===null)this._equirectMaterial=KU(),this._compileMaterial(this._equirectMaterial)}dispose(){if(this._dispose(),this._cubemapMaterial!==null)this._cubemapMaterial.dispose();if(this._equirectMaterial!==null)this._equirectMaterial.dispose();if(this._backgroundBox!==null)this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose()}_setSize(J){this._lodMax=Math.floor(Math.log2(J)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){if(this._blurMaterial!==null)this._blurMaterial.dispose();if(this._ggxMaterial!==null)this._ggxMaterial.dispose();if(this._pingPongRenderTarget!==null)this._pingPongRenderTarget.dispose();for(let J=0;J<this._lodMeshes.length;J++)this._lodMeshes[J].geometry.dispose()}_cleanup(J){this._renderer.setRenderTarget(UK,GK,NK),this._renderer.xr.enabled=qK,J.scissorTest=!1,P7(J,0,0,J.width,J.height)}_fromTexture(J,Q){if(J.mapping===B7||J.mapping===T8)this._setSize(J.image.length===0?16:J.image[0].width||J.image[0].image.width);else this._setSize(J.image.width/4);UK=this._renderer.getRenderTarget(),GK=this._renderer.getActiveCubeFace(),NK=this._renderer.getActiveMipmapLevel(),qK=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let $=Q||this._allocateTargets();return this._textureToCubeUV(J,$),this._applyPMREM($),this._cleanup($),$}_allocateTargets(){let J=3*Math.max(this._cubeSize,112),Q=4*this._cubeSize,$={magFilter:sJ,minFilter:sJ,generateMipmaps:!1,type:p9,format:C9,colorSpace:W6,depthBuffer:!1},Z=WU(J,Q,$);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==J||this._pingPongRenderTarget.height!==Q){if(this._pingPongRenderTarget!==null)this._dispose();this._pingPongRenderTarget=WU(J,Q,$);let{_lodMax:W}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=pF(W)),this._blurMaterial=dF(W,J,Q),this._ggxMaterial=mF(W,J,Q)}return Z}_compileMaterial(J){let Q=new VJ(new u0,J);this._renderer.compile(Q,k6)}_sceneToCubeUV(J,Q,$,Z,W){let Y=new PJ(90,1,Q,$),X=[1,-1,1,1,1,1],U=[1,1,1,-1,-1,-1],N=this._renderer,q=N.autoClear,G=N.toneMapping;if(N.getClearColor(ZU),N.toneMapping=q9,N.autoClear=!1,N.state.buffers.depth.getReversed())N.setRenderTarget(Z),N.clearDepth(),N.setRenderTarget(null);if(this._backgroundBox===null)this._backgroundBox=new VJ(new h8,new d9({name:"PMREM.Background",side:nJ,depthWrite:!1,depthTest:!1}));let O=this._backgroundBox,R=O.material,D=!1,F=J.background;if(F){if(F.isColor)R.color.copy(F),J.background=null,D=!0}else R.color.copy(ZU),D=!0;for(let M=0;M<6;M++){let L=M%3;if(L===0)Y.up.set(0,X[M],0),Y.position.set(W.x,W.y,W.z),Y.lookAt(W.x+U[M],W.y,W.z);else if(L===1)Y.up.set(0,0,X[M]),Y.position.set(W.x,W.y,W.z),Y.lookAt(W.x,W.y+U[M],W.z);else Y.up.set(0,X[M],0),Y.position.set(W.x,W.y,W.z),Y.lookAt(W.x,W.y,W.z+U[M]);let B=this._cubeSize;if(P7(Z,L*B,M>2?B:0,B,B),N.setRenderTarget(Z),D)N.render(O,Y);N.render(J,Y)}N.toneMapping=G,N.autoClear=q,J.background=F}_textureToCubeUV(J,Q){let $=this._renderer,Z=J.mapping===B7||J.mapping===T8;if(Z){if(this._cubemapMaterial===null)this._cubemapMaterial=HU();this._cubemapMaterial.uniforms.flipEnvMap.value=J.isRenderTargetTexture===!1?-1:1}else if(this._equirectMaterial===null)this._equirectMaterial=KU();let W=Z?this._cubemapMaterial:this._equirectMaterial,K=this._lodMeshes[0];K.material=W;let H=W.uniforms;H.envMap.value=J;let Y=this._cubeSize;P7(Q,0,0,3*Y,2*Y),$.setRenderTarget(Q),$.render(K,k6)}_applyPMREM(J){let Q=this._renderer,$=Q.autoClear;Q.autoClear=!1;let Z=this._lodMeshes.length;for(let W=1;W<Z;W++)this._applyGGXFilter(J,W-1,W);Q.autoClear=$}_applyGGXFilter(J,Q,$){let Z=this._renderer,W=this._pingPongRenderTarget,K=this._ggxMaterial,H=this._lodMeshes[$];H.material=K;let Y=K.uniforms,X=$/(this._lodMeshes.length-1),U=Q/(this._lodMeshes.length-1),N=Math.sqrt(X*X-U*U),q=0+X*1.25,G=N*q,{_lodMax:E}=this,O=this._sizeLods[$],R=3*O*($>E-X8?$-E+X8:0),D=4*(this._cubeSize-O);Y.envMap.value=J.texture,Y.roughness.value=G,Y.mipInt.value=E-Q,P7(W,R,D,3*O,2*O),Z.setRenderTarget(W),Z.render(H,k6),Y.envMap.value=W.texture,Y.roughness.value=0,Y.mipInt.value=E-$,P7(J,R,D,3*O,2*O),Z.setRenderTarget(J),Z.render(H,k6)}_blur(J,Q,$,Z,W){let K=this._pingPongRenderTarget;this._halfBlur(J,K,Q,$,Z,"latitudinal",W),this._halfBlur(K,J,$,$,Z,"longitudinal",W)}_halfBlur(J,Q,$,Z,W,K,H){let Y=this._renderer,X=this._blurMaterial;if(K!=="latitudinal"&&K!=="longitudinal")j0("blur direction must be either latitudinal or longitudinal!");let U=3,N=this._lodMeshes[Z];N.material=X;let q=X.uniforms,G=this._sizeLods[$]-1,E=isFinite(W)?Math.PI/(2*G):2*Math.PI/(2*d8-1),O=W/E,R=isFinite(W)?1+Math.floor(U*O):d8;if(R>d8)q0(`sigmaRadians, ${W}, is too large and will clip, as it requested ${R} samples when the maximum is set to ${d8}`);let D=[],F=0;for(let C=0;C<d8;++C){let w=C/O,k=Math.exp(-w*w/2);if(D.push(k),C===0)F+=k;else if(C<R)F+=2*k}for(let C=0;C<D.length;C++)D[C]=D[C]/F;if(q.envMap.value=J.texture,q.samples.value=R,q.weights.value=D,q.latitudinal.value=K==="latitudinal",H)q.poleAxis.value=H;let{_lodMax:M}=this;q.dTheta.value=E,q.mipInt.value=M-$;let L=this._sizeLods[Z],B=3*L*(Z>M-X8?Z-M+X8:0),P=4*(this._cubeSize-L);P7(Q,B,P,3*L,2*L),Y.setRenderTarget(Q),Y.render(N,k6)}}function pF(J){let Q=[],$=[],Z=[],W=J,K=J-X8+1+$U.length;for(let H=0;H<K;H++){let Y=Math.pow(2,W);Q.push(Y);let X=1/Y;if(H>J-X8)X=$U[H-J+X8-1];else if(H===0)X=0;$.push(X);let U=1/(Y-2),N=-U,q=1+U,G=[N,N,q,N,q,q,N,N,q,q,N,q],E=6,O=6,R=3,D=2,F=1,M=new Float32Array(R*O*E),L=new Float32Array(D*O*E),B=new Float32Array(F*O*E);for(let C=0;C<E;C++){let w=C%3*2/3-1,k=C>2?0:-1,A=[w,k,0,w+0.6666666666666666,k,0,w+0.6666666666666666,k+1,0,w,k,0,w+0.6666666666666666,k+1,0,w,k+1,0];M.set(A,R*O*C),L.set(G,D*O*C);let h=[C,C,C,C,C,C];B.set(h,F*O*C)}let P=new u0;if(P.setAttribute("position",new HJ(M,R)),P.setAttribute("uv",new HJ(L,D)),P.setAttribute("faceIndex",new HJ(B,F)),Z.push(new VJ(P,null)),W>X8)W--}return{lodMeshes:Z,sizeLods:Q,sigmas:$}}function WU(J,Q,$){let Z=new iJ(J,Q,$);return Z.texture.mapping=Q6,Z.texture.name="PMREM.cubeUv",Z.scissorTest=!0,Z}function P7(J,Q,$,Z,W){J.viewport.set(Q,$,Z,W),J.scissor.set(Q,$,Z,W)}function mF(J,Q,$){return new Q9({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:xF,CUBEUV_TEXEL_WIDTH:1/Q,CUBEUV_TEXEL_HEIGHT:1/$,CUBEUV_MAX_MIP:`${J}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:R$(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:I9,depthTest:!1,depthWrite:!1})}function dF(J,Q,$){let Z=new Float32Array(d8),W=new _(0,1,0);return new Q9({name:"SphericalGaussianBlur",defines:{n:d8,CUBEUV_TEXEL_WIDTH:1/Q,CUBEUV_TEXEL_HEIGHT:1/$,CUBEUV_MAX_MIP:`${J}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:Z},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:W}},vertexShader:R$(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:I9,depthTest:!1,depthWrite:!1})}function KU(){return new Q9({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:R$(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:I9,depthTest:!1,depthWrite:!1})}function HU(){return new Q9({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:R$(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:I9,depthTest:!1,depthWrite:!1})}function R$(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}class kK extends iJ{constructor(J=1,Q={}){super(J,J,Q);this.isWebGLCubeRenderTarget=!0;let $={width:J,height:J,depth:1},Z=[$,$,$,$,$,$];this.texture=new C7(Z),this._setTextureOptions(Q),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(J,Q){this.texture.type=Q.type,this.texture.colorSpace=Q.colorSpace,this.texture.generateMipmaps=Q.generateMipmaps,this.texture.minFilter=Q.minFilter,this.texture.magFilter=Q.magFilter;let $={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},Z=new h8(5,5,5),W=new Q9({name:"CubemapFromEquirect",uniforms:x8($.uniforms),vertexShader:$.vertexShader,fragmentShader:$.fragmentShader,side:nJ,blending:I9});W.uniforms.tEquirect.value=Q;let K=new VJ(Z,W),H=Q.minFilter;if(Q.minFilter===S8)Q.minFilter=sJ;return new eW(1,10,this).update(J,K),Q.minFilter=H,K.geometry.dispose(),K.material.dispose(),this}clear(J,Q=!0,$=!0,Z=!0){let W=J.getRenderTarget();for(let K=0;K<6;K++)J.setRenderTarget(this,K),J.clear(Q,$,Z);J.setRenderTarget(W)}}function lF(J){let Q=new WeakMap,$=new WeakMap,Z=null;function W(G,E=!1){if(G===null||G===void 0)return null;if(E)return H(G);return K(G)}function K(G){if(G&&G.isTexture){let E=G.mapping;if(E===kQ||E===MQ)if(Q.has(G)){let O=Q.get(G).texture;return Y(O,G.mapping)}else{let O=G.image;if(O&&O.height>0){let R=new kK(O.height);return R.fromEquirectangularTexture(J,G),Q.set(G,R),G.addEventListener("dispose",U),Y(R.texture,G.mapping)}else return null}}return G}function H(G){if(G&&G.isTexture){let E=G.mapping,O=E===kQ||E===MQ,R=E===B7||E===T8;if(O||R){let D=$.get(G),F=D!==void 0?D.texture.pmremVersion:0;if(G.isRenderTargetTexture&&G.pmremVersion!==F){if(Z===null)Z=new DK(J);return D=O?Z.fromEquirectangular(G,D):Z.fromCubemap(G,D),D.texture.pmremVersion=G.pmremVersion,$.set(G,D),D.texture}else if(D!==void 0)return D.texture;else{let M=G.image;if(O&&M&&M.height>0||R&&M&&X(M)){if(Z===null)Z=new DK(J);return D=O?Z.fromEquirectangular(G):Z.fromCubemap(G),D.texture.pmremVersion=G.pmremVersion,$.set(G,D),G.addEventListener("dispose",N),D.texture}else return null}}}return G}function Y(G,E){if(E===kQ)G.mapping=B7;else if(E===MQ)G.mapping=T8;return G}function X(G){let E=0,O=6;for(let R=0;R<O;R++)if(G[R]!==void 0)E++;return E===O}function U(G){let E=G.target;E.removeEventListener("dispose",U);let O=Q.get(E);if(O!==void 0)Q.delete(E),O.dispose()}function N(G){let E=G.target;E.removeEventListener("dispose",N);let O=$.get(E);if(O!==void 0)$.delete(E),O.dispose()}function q(){if(Q=new WeakMap,$=new WeakMap,Z!==null)Z.dispose(),Z=null}return{get:W,dispose:q}}function uF(J){let Q={};function $(Z){if(Q[Z]!==void 0)return Q[Z];let W=J.getExtension(Z);return Q[Z]=W,W}return{has:function(Z){return $(Z)!==null},init:function(){$("EXT_color_buffer_float"),$("WEBGL_clip_cull_distance"),$("OES_texture_float_linear"),$("EXT_color_buffer_half_float"),$("WEBGL_multisampled_render_to_texture"),$("WEBGL_render_shared_exponent")},get:function(Z){let W=$(Z);if(W===null)i7("WebGLRenderer: "+Z+" extension not supported.");return W}}}function cF(J,Q,$,Z){let W={},K=new WeakMap;function H(q){let G=q.target;if(G.index!==null)Q.remove(G.index);for(let O in G.attributes)Q.remove(G.attributes[O]);G.removeEventListener("dispose",H),delete W[G.id];let E=K.get(G);if(E)Q.remove(E),K.delete(G);if(Z.releaseStatesOfGeometry(G),G.isInstancedBufferGeometry===!0)delete G._maxInstanceCount;$.memory.geometries--}function Y(q,G){if(W[G.id]===!0)return G;return G.addEventListener("dispose",H),W[G.id]=!0,$.memory.geometries++,G}function X(q){let G=q.attributes;for(let E in G)Q.update(G[E],J.ARRAY_BUFFER)}function U(q){let G=[],E=q.index,O=q.attributes.position,R=0;if(O===void 0)return;if(E!==null){let M=E.array;R=E.version;for(let L=0,B=M.length;L<B;L+=3){let P=M[L+0],C=M[L+1],w=M[L+2];G.push(P,C,C,w,w,P)}}else{let M=O.array;R=O.version;for(let L=0,B=M.length/3-1;L<B;L+=3){let P=L+0,C=L+1,w=L+2;G.push(P,C,C,w,w,P)}}let D=new(O.count>=65535?jQ:SQ)(G,1);D.version=R;let F=K.get(q);if(F)Q.remove(F);K.set(q,D)}function N(q){let G=K.get(q);if(G){let E=q.index;if(E!==null){if(G.version<E.version)U(q)}}else U(q);return K.get(q)}return{get:Y,update:X,getWireframeAttribute:N}}function nF(J,Q,$){let Z;function W(G){Z=G}let K,H;function Y(G){K=G.type,H=G.bytesPerElement}function X(G,E){J.drawElements(Z,E,K,G*H),$.update(E,Z,1)}function U(G,E,O){if(O===0)return;J.drawElementsInstanced(Z,E,K,G*H,O),$.update(E,Z,O)}function N(G,E,O){if(O===0)return;Q.get("WEBGL_multi_draw").multiDrawElementsWEBGL(Z,E,0,K,G,0,O);let D=0;for(let F=0;F<O;F++)D+=E[F];$.update(D,Z,1)}function q(G,E,O,R){if(O===0)return;let D=Q.get("WEBGL_multi_draw");if(D===null)for(let F=0;F<G.length;F++)U(G[F]/H,E[F],R[F]);else{D.multiDrawElementsInstancedWEBGL(Z,E,0,K,G,0,R,0,O);let F=0;for(let M=0;M<O;M++)F+=E[M]*R[M];$.update(F,Z,1)}}this.setMode=W,this.setIndex=Y,this.render=X,this.renderInstances=U,this.renderMultiDraw=N,this.renderMultiDrawInstances=q}function sF(J){let Q={geometries:0,textures:0},$={frame:0,calls:0,triangles:0,points:0,lines:0};function Z(K,H,Y){switch($.calls++,H){case J.TRIANGLES:$.triangles+=Y*(K/3);break;case J.LINES:$.lines+=Y*(K/2);break;case J.LINE_STRIP:$.lines+=Y*(K-1);break;case J.LINE_LOOP:$.lines+=Y*K;break;case J.POINTS:$.points+=Y*K;break;default:j0("WebGLInfo: Unknown draw mode:",H);break}}function W(){$.calls=0,$.triangles=0,$.points=0,$.lines=0}return{memory:Q,render:$,programs:null,autoReset:!0,reset:W,update:Z}}function iF(J,Q,$){let Z=new WeakMap,W=new qJ;function K(H,Y,X){let U=H.morphTargetInfluences,N=Y.morphAttributes.position||Y.morphAttributes.normal||Y.morphAttributes.color,q=N!==void 0?N.length:0,G=Z.get(Y);if(G===void 0||G.count!==q){let A=function(){w.dispose(),Z.delete(Y),Y.removeEventListener("dispose",A)};if(G!==void 0)G.texture.dispose();let E=Y.morphAttributes.position!==void 0,O=Y.morphAttributes.normal!==void 0,R=Y.morphAttributes.color!==void 0,D=Y.morphAttributes.position||[],F=Y.morphAttributes.normal||[],M=Y.morphAttributes.color||[],L=0;if(E===!0)L=1;if(O===!0)L=2;if(R===!0)L=3;let B=Y.attributes.position.count*L,P=1;if(B>Q.maxTextureSize)P=Math.ceil(B/Q.maxTextureSize),B=Q.maxTextureSize;let C=new Float32Array(B*P*4*q),w=new K6(C,B,P,q);w.type=g9,w.needsUpdate=!0;let k=L*4;for(let h=0;h<q;h++){let S=D[h],v=F[h],l=M[h],f=B*P*4*h;for(let c=0;c<S.count;c++){let x=c*k;if(E===!0)W.fromBufferAttribute(S,c),C[f+x+0]=W.x,C[f+x+1]=W.y,C[f+x+2]=W.z,C[f+x+3]=0;if(O===!0)W.fromBufferAttribute(v,c),C[f+x+4]=W.x,C[f+x+5]=W.y,C[f+x+6]=W.z,C[f+x+7]=0;if(R===!0)W.fromBufferAttribute(l,c),C[f+x+8]=W.x,C[f+x+9]=W.y,C[f+x+10]=W.z,C[f+x+11]=l.itemSize===4?W.w:1}}G={count:q,texture:w,size:new s(B,P)},Z.set(Y,G),Y.addEventListener("dispose",A)}if(H.isInstancedMesh===!0&&H.morphTexture!==null)X.getUniforms().setValue(J,"morphTexture",H.morphTexture,$);else{let E=0;for(let R=0;R<U.length;R++)E+=U[R];let O=Y.morphTargetsRelative?1:1-E;X.getUniforms().setValue(J,"morphTargetBaseInfluence",O),X.getUniforms().setValue(J,"morphTargetInfluences",U)}X.getUniforms().setValue(J,"morphTargetsTexture",G.texture,$),X.getUniforms().setValue(J,"morphTargetsTextureSize",G.size)}return{update:K}}function oF(J,Q,$,Z,W){let K=new WeakMap;function H(U){let N=W.render.frame,q=U.geometry,G=Q.get(U,q);if(K.get(G)!==N)Q.update(G),K.set(G,N);if(U.isInstancedMesh){if(U.hasEventListener("dispose",X)===!1)U.addEventListener("dispose",X);if(K.get(U)!==N){if($.update(U.instanceMatrix,J.ARRAY_BUFFER),U.instanceColor!==null)$.update(U.instanceColor,J.ARRAY_BUFFER);K.set(U,N)}}if(U.isSkinnedMesh){let E=U.skeleton;if(K.get(E)!==N)E.update(),K.set(E,N)}return G}function Y(){K=new WeakMap}function X(U){let N=U.target;if(N.removeEventListener("dispose",X),Z.releaseStatesOfObject(N),$.remove(N.instanceMatrix),N.instanceColor!==null)$.remove(N.instanceColor)}return{update:H,dispose:Y}}var aF={[DZ]:"LINEAR_TONE_MAPPING",[OZ]:"REINHARD_TONE_MAPPING",[RZ]:"CINEON_TONE_MAPPING",[kZ]:"ACES_FILMIC_TONE_MAPPING",[LZ]:"AGX_TONE_MAPPING",[VZ]:"NEUTRAL_TONE_MAPPING",[MZ]:"CUSTOM_TONE_MAPPING"};function rF(J,Q,$,Z,W){let K=new iJ(Q,$,{type:J,depthBuffer:Z,stencilBuffer:W}),H=new iJ(Q,$,{type:p9,depthBuffer:!1,stencilBuffer:!1}),Y=new u0;Y.setAttribute("position",new B0([-1,3,0,-1,-1,0,3,-1,0],3)),Y.setAttribute("uv",new B0([0,2,0,0,2,0],2));let X=new $$({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),U=new VJ(Y,X),N=new _7(-1,1,1,-1,0,1),q=null,G=null,E=!1,O,R=null,D=[],F=!1;this.setSize=function(M,L){K.setSize(M,L),H.setSize(M,L);for(let B=0;B<D.length;B++){let P=D[B];if(P.setSize)P.setSize(M,L)}},this.setEffects=function(M){D=M,F=D.length>0&&D[0].isRenderPass===!0;let{width:L,height:B}=K;for(let P=0;P<D.length;P++){let C=D[P];if(C.setSize)C.setSize(L,B)}},this.begin=function(M,L){if(E)return!1;if(M.toneMapping===q9&&D.length===0)return!1;if(R=L,L!==null){let{width:B,height:P}=L;if(K.width!==B||K.height!==P)this.setSize(B,P)}if(F===!1)M.setRenderTarget(K);return O=M.toneMapping,M.toneMapping=q9,!0},this.hasRenderPass=function(){return F},this.end=function(M,L){M.toneMapping=O,E=!0;let B=K,P=H;for(let C=0;C<D.length;C++){let w=D[C];if(w.enabled===!1)continue;if(w.render(M,P,B,L),w.needsSwap!==!1){let k=B;B=P,P=k}}if(q!==M.outputColorSpace||G!==M.toneMapping){if(q=M.outputColorSpace,G=M.toneMapping,X.defines={},JJ.getTransfer(q)===EJ)X.defines.SRGB_TRANSFER="";let C=aF[G];if(C)X.defines[C]="";X.needsUpdate=!0}X.uniforms.tDiffuse.value=B.texture,M.setRenderTarget(R),M.render(U,N),R=null,E=!1},this.isCompositing=function(){return E},this.dispose=function(){K.dispose(),H.dispose(),Y.dispose(),X.dispose()}}var CU=new kJ,OK=new v8(1,1),wU=new K6,AU=new H6,_U=new C7,YU=[],XU=[],UU=new Float32Array(16),GU=new Float32Array(9),NU=new Float32Array(4);function T7(J,Q,$){let Z=J[0];if(Z<=0||Z>0)return J;let W=Q*$,K=YU[W];if(K===void 0)K=new Float32Array(W),YU[W]=K;if(Q!==0){Z.toArray(K,0);for(let H=1,Y=0;H!==Q;++H)Y+=$,J[H].toArray(K,Y)}return K}function IJ(J,Q){if(J.length!==Q.length)return!1;for(let $=0,Z=J.length;$<Z;$++)if(J[$]!==Q[$])return!1;return!0}function CJ(J,Q){for(let $=0,Z=Q.length;$<Z;$++)J[$]=Q[$]}function k$(J,Q){let $=XU[Q];if($===void 0)$=new Int32Array(Q),XU[Q]=$;for(let Z=0;Z!==Q;++Z)$[Z]=J.allocateTextureUnit();return $}function tF(J,Q){let $=this.cache;if($[0]===Q)return;J.uniform1f(this.addr,Q),$[0]=Q}function eF(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y)J.uniform2f(this.addr,Q.x,Q.y),$[0]=Q.x,$[1]=Q.y}else{if(IJ($,Q))return;J.uniform2fv(this.addr,Q),CJ($,Q)}}function JD(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z)J.uniform3f(this.addr,Q.x,Q.y,Q.z),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z}else if(Q.r!==void 0){if($[0]!==Q.r||$[1]!==Q.g||$[2]!==Q.b)J.uniform3f(this.addr,Q.r,Q.g,Q.b),$[0]=Q.r,$[1]=Q.g,$[2]=Q.b}else{if(IJ($,Q))return;J.uniform3fv(this.addr,Q),CJ($,Q)}}function QD(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z||$[3]!==Q.w)J.uniform4f(this.addr,Q.x,Q.y,Q.z,Q.w),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z,$[3]=Q.w}else{if(IJ($,Q))return;J.uniform4fv(this.addr,Q),CJ($,Q)}}function $D(J,Q){let $=this.cache,Z=Q.elements;if(Z===void 0){if(IJ($,Q))return;J.uniformMatrix2fv(this.addr,!1,Q),CJ($,Q)}else{if(IJ($,Z))return;NU.set(Z),J.uniformMatrix2fv(this.addr,!1,NU),CJ($,Z)}}function ZD(J,Q){let $=this.cache,Z=Q.elements;if(Z===void 0){if(IJ($,Q))return;J.uniformMatrix3fv(this.addr,!1,Q),CJ($,Q)}else{if(IJ($,Z))return;GU.set(Z),J.uniformMatrix3fv(this.addr,!1,GU),CJ($,Z)}}function WD(J,Q){let $=this.cache,Z=Q.elements;if(Z===void 0){if(IJ($,Q))return;J.uniformMatrix4fv(this.addr,!1,Q),CJ($,Q)}else{if(IJ($,Z))return;UU.set(Z),J.uniformMatrix4fv(this.addr,!1,UU),CJ($,Z)}}function KD(J,Q){let $=this.cache;if($[0]===Q)return;J.uniform1i(this.addr,Q),$[0]=Q}function HD(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y)J.uniform2i(this.addr,Q.x,Q.y),$[0]=Q.x,$[1]=Q.y}else{if(IJ($,Q))return;J.uniform2iv(this.addr,Q),CJ($,Q)}}function YD(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z)J.uniform3i(this.addr,Q.x,Q.y,Q.z),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z}else{if(IJ($,Q))return;J.uniform3iv(this.addr,Q),CJ($,Q)}}function XD(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z||$[3]!==Q.w)J.uniform4i(this.addr,Q.x,Q.y,Q.z,Q.w),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z,$[3]=Q.w}else{if(IJ($,Q))return;J.uniform4iv(this.addr,Q),CJ($,Q)}}function UD(J,Q){let $=this.cache;if($[0]===Q)return;J.uniform1ui(this.addr,Q),$[0]=Q}function GD(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y)J.uniform2ui(this.addr,Q.x,Q.y),$[0]=Q.x,$[1]=Q.y}else{if(IJ($,Q))return;J.uniform2uiv(this.addr,Q),CJ($,Q)}}function ND(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z)J.uniform3ui(this.addr,Q.x,Q.y,Q.z),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z}else{if(IJ($,Q))return;J.uniform3uiv(this.addr,Q),CJ($,Q)}}function qD(J,Q){let $=this.cache;if(Q.x!==void 0){if($[0]!==Q.x||$[1]!==Q.y||$[2]!==Q.z||$[3]!==Q.w)J.uniform4ui(this.addr,Q.x,Q.y,Q.z,Q.w),$[0]=Q.x,$[1]=Q.y,$[2]=Q.z,$[3]=Q.w}else{if(IJ($,Q))return;J.uniform4uiv(this.addr,Q),CJ($,Q)}}function ED(J,Q,$){let Z=this.cache,W=$.allocateTextureUnit();if(Z[0]!==W)J.uniform1i(this.addr,W),Z[0]=W;let K;if(this.type===J.SAMPLER_2D_SHADOW)OK.compareFunction=$.isReversedDepthBuffer()?AQ:wQ,K=OK;else K=CU;$.setTexture2D(Q||K,W)}function FD(J,Q,$){let Z=this.cache,W=$.allocateTextureUnit();if(Z[0]!==W)J.uniform1i(this.addr,W),Z[0]=W;$.setTexture3D(Q||AU,W)}function DD(J,Q,$){let Z=this.cache,W=$.allocateTextureUnit();if(Z[0]!==W)J.uniform1i(this.addr,W),Z[0]=W;$.setTextureCube(Q||_U,W)}function OD(J,Q,$){let Z=this.cache,W=$.allocateTextureUnit();if(Z[0]!==W)J.uniform1i(this.addr,W),Z[0]=W;$.setTexture2DArray(Q||wU,W)}function RD(J){switch(J){case 5126:return tF;case 35664:return eF;case 35665:return JD;case 35666:return QD;case 35674:return $D;case 35675:return ZD;case 35676:return WD;case 5124:case 35670:return KD;case 35667:case 35671:return HD;case 35668:case 35672:return YD;case 35669:case 35673:return XD;case 5125:return UD;case 36294:return GD;case 36295:return ND;case 36296:return qD;case 35678:case 36198:case 36298:case 36306:case 35682:return ED;case 35679:case 36299:case 36307:return FD;case 35680:case 36300:case 36308:case 36293:return DD;case 36289:case 36303:case 36311:case 36292:return OD}}function kD(J,Q){J.uniform1fv(this.addr,Q)}function MD(J,Q){let $=T7(Q,this.size,2);J.uniform2fv(this.addr,$)}function LD(J,Q){let $=T7(Q,this.size,3);J.uniform3fv(this.addr,$)}function VD(J,Q){let $=T7(Q,this.size,4);J.uniform4fv(this.addr,$)}function BD(J,Q){let $=T7(Q,this.size,4);J.uniformMatrix2fv(this.addr,!1,$)}function zD(J,Q){let $=T7(Q,this.size,9);J.uniformMatrix3fv(this.addr,!1,$)}function ID(J,Q){let $=T7(Q,this.size,16);J.uniformMatrix4fv(this.addr,!1,$)}function CD(J,Q){J.uniform1iv(this.addr,Q)}function wD(J,Q){J.uniform2iv(this.addr,Q)}function AD(J,Q){J.uniform3iv(this.addr,Q)}function _D(J,Q){J.uniform4iv(this.addr,Q)}function PD(J,Q){J.uniform1uiv(this.addr,Q)}function TD(J,Q){J.uniform2uiv(this.addr,Q)}function SD(J,Q){J.uniform3uiv(this.addr,Q)}function jD(J,Q){J.uniform4uiv(this.addr,Q)}function yD(J,Q,$){let Z=this.cache,W=Q.length,K=k$($,W);if(!IJ(Z,K))J.uniform1iv(this.addr,K),CJ(Z,K);let H;if(this.type===J.SAMPLER_2D_SHADOW)H=OK;else H=CU;for(let Y=0;Y!==W;++Y)$.setTexture2D(Q[Y]||H,K[Y])}function fD(J,Q,$){let Z=this.cache,W=Q.length,K=k$($,W);if(!IJ(Z,K))J.uniform1iv(this.addr,K),CJ(Z,K);for(let H=0;H!==W;++H)$.setTexture3D(Q[H]||AU,K[H])}function bD(J,Q,$){let Z=this.cache,W=Q.length,K=k$($,W);if(!IJ(Z,K))J.uniform1iv(this.addr,K),CJ(Z,K);for(let H=0;H!==W;++H)$.setTextureCube(Q[H]||_U,K[H])}function vD(J,Q,$){let Z=this.cache,W=Q.length,K=k$($,W);if(!IJ(Z,K))J.uniform1iv(this.addr,K),CJ(Z,K);for(let H=0;H!==W;++H)$.setTexture2DArray(Q[H]||wU,K[H])}function hD(J){switch(J){case 5126:return kD;case 35664:return MD;case 35665:return LD;case 35666:return VD;case 35674:return BD;case 35675:return zD;case 35676:return ID;case 5124:case 35670:return CD;case 35667:case 35671:return wD;case 35668:case 35672:return AD;case 35669:case 35673:return _D;case 5125:return PD;case 36294:return TD;case 36295:return SD;case 36296:return jD;case 35678:case 36198:case 36298:case 36306:case 35682:return yD;case 35679:case 36299:case 36307:return fD;case 35680:case 36300:case 36308:case 36293:return bD;case 36289:case 36303:case 36311:case 36292:return vD}}class PU{constructor(J,Q,$){this.id=J,this.addr=$,this.cache=[],this.type=Q.type,this.setValue=RD(Q.type)}}class TU{constructor(J,Q,$){this.id=J,this.addr=$,this.cache=[],this.type=Q.type,this.size=Q.size,this.setValue=hD(Q.type)}}class SU{constructor(J){this.id=J,this.seq=[],this.map={}}setValue(J,Q,$){let Z=this.seq;for(let W=0,K=Z.length;W!==K;++W){let H=Z[W];H.setValue(J,Q[H.id],$)}}}var EK=/(\w+)(\])?(\[|\.)?/g;function qU(J,Q){J.seq.push(Q),J.map[Q.id]=Q}function xD(J,Q,$){let Z=J.name,W=Z.length;EK.lastIndex=0;while(!0){let K=EK.exec(Z),H=EK.lastIndex,Y=K[1],X=K[2]==="]",U=K[3];if(X)Y=Y|0;if(U===void 0||U==="["&&H+2===W){qU($,U===void 0?new PU(Y,J,Q):new TU(Y,J,Q));break}else{let q=$.map[Y];if(q===void 0)q=new SU(Y),qU($,q);$=q}}}class V6{constructor(J,Q){this.seq=[],this.map={};let $=J.getProgramParameter(Q,J.ACTIVE_UNIFORMS);for(let K=0;K<$;++K){let H=J.getActiveUniform(Q,K),Y=J.getUniformLocation(Q,H.name);xD(H,Y,this)}let Z=[],W=[];for(let K of this.seq)if(K.type===J.SAMPLER_2D_SHADOW||K.type===J.SAMPLER_CUBE_SHADOW||K.type===J.SAMPLER_2D_ARRAY_SHADOW)Z.push(K);else W.push(K);if(Z.length>0)this.seq=Z.concat(W)}setValue(J,Q,$,Z){let W=this.map[Q];if(W!==void 0)W.setValue(J,$,Z)}setOptional(J,Q,$){let Z=Q[$];if(Z!==void 0)this.setValue(J,$,Z)}static upload(J,Q,$,Z){for(let W=0,K=Q.length;W!==K;++W){let H=Q[W],Y=$[H.id];if(Y.needsUpdate!==!1)H.setValue(J,Y.value,Z)}}static seqWithValue(J,Q){let $=[];for(let Z=0,W=J.length;Z!==W;++Z){let K=J[Z];if(K.id in Q)$.push(K)}return $}}function EU(J,Q,$){let Z=J.createShader(Q);return J.shaderSource(Z,$),J.compileShader(Z),Z}var gD=37297,pD=0;function mD(J,Q){let $=J.split(`
`),Z=[],W=Math.max(Q-6,0),K=Math.min(Q+6,$.length);for(let H=W;H<K;H++){let Y=H+1;Z.push(`${Y===Q?">":" "} ${Y}: ${$[H]}`)}return Z.join(`
`)}var FU=new n0;function dD(J){JJ._getMatrix(FU,JJ.workingColorSpace,J);let Q=`mat3( ${FU.elements.map(($)=>$.toFixed(4))} )`;switch(JJ.getTransfer(J)){case HW:return[Q,"LinearTransferOETF"];case EJ:return[Q,"sRGBTransferOETF"];default:return q0("WebGLProgram: Unsupported color space: ",J),[Q,"LinearTransferOETF"]}}function DU(J,Q,$){let Z=J.getShaderParameter(Q,J.COMPILE_STATUS),K=(J.getShaderInfoLog(Q)||"").trim();if(Z&&K==="")return"";let H=/ERROR: 0:(\d+)/.exec(K);if(H){let Y=parseInt(H[1]);return $.toUpperCase()+`

`+K+`

`+mD(J.getShaderSource(Q),Y)}else return K}function lD(J,Q){let $=dD(Q);return[`vec4 ${J}( vec4 value ) {`,`	return ${$[1]}( vec4( value.rgb * ${$[0]}, value.a ) );`,"}"].join(`
`)}var uD={[DZ]:"Linear",[OZ]:"Reinhard",[RZ]:"Cineon",[kZ]:"ACESFilmic",[LZ]:"AgX",[VZ]:"Neutral",[MZ]:"Custom"};function cD(J,Q){let $=uD[Q];if($===void 0)return q0("WebGLProgram: Unsupported toneMapping:",Q),"vec3 "+J+"( vec3 color ) { return LinearToneMapping( color ); }";return"vec3 "+J+"( vec3 color ) { return "+$+"ToneMapping( color ); }"}var O$=new _;function nD(){JJ.getLuminanceCoefficients(O$);let J=O$.x.toFixed(4),Q=O$.y.toFixed(4),$=O$.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${J}, ${Q}, ${$} );`,"\treturn dot( weights, rgb );","}"].join(`
`)}function sD(J){return[J.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",J.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(L6).join(`
`)}function iD(J){let Q=[];for(let $ in J){let Z=J[$];if(Z===!1)continue;Q.push("#define "+$+" "+Z)}return Q.join(`
`)}function oD(J,Q){let $={},Z=J.getProgramParameter(Q,J.ACTIVE_ATTRIBUTES);for(let W=0;W<Z;W++){let K=J.getActiveAttrib(Q,W),H=K.name,Y=1;if(K.type===J.FLOAT_MAT2)Y=2;if(K.type===J.FLOAT_MAT3)Y=3;if(K.type===J.FLOAT_MAT4)Y=4;$[H]={type:K.type,location:J.getAttribLocation(Q,H),locationSize:Y}}return $}function L6(J){return J!==""}function OU(J,Q){let $=Q.numSpotLightShadows+Q.numSpotLightMaps-Q.numSpotLightShadowsWithMaps;return J.replace(/NUM_DIR_LIGHTS/g,Q.numDirLights).replace(/NUM_SPOT_LIGHTS/g,Q.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,Q.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,$).replace(/NUM_RECT_AREA_LIGHTS/g,Q.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,Q.numPointLights).replace(/NUM_HEMI_LIGHTS/g,Q.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,Q.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,Q.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,Q.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,Q.numPointLightShadows)}function RU(J,Q){return J.replace(/NUM_CLIPPING_PLANES/g,Q.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,Q.numClippingPlanes-Q.numClipIntersection)}var aD=/^[ \t]*#include +<([\w\d./]+)>/gm;function RK(J){return J.replace(aD,tD)}var rD=new Map;function tD(J,Q){let $=a0[Q];if($===void 0){let Z=rD.get(Q);if(Z!==void 0)$=a0[Z],q0('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',Q,Z);else throw Error("Can not resolve #include <"+Q+">")}return RK($)}var eD=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function kU(J){return J.replace(eD,J1)}function J1(J,Q,$,Z){let W="";for(let K=parseInt(Q);K<parseInt($);K++)W+=Z.replace(/\[\s*i\s*\]/g,"[ "+K+" ]").replace(/UNROLLED_LOOP_INDEX/g,K);return W}function MU(J){let Q=`precision ${J.precision} float;
	precision ${J.precision} int;
	precision ${J.precision} sampler2D;
	precision ${J.precision} samplerCube;
	precision ${J.precision} sampler3D;
	precision ${J.precision} sampler2DArray;
	precision ${J.precision} sampler2DShadow;
	precision ${J.precision} samplerCubeShadow;
	precision ${J.precision} sampler2DArrayShadow;
	precision ${J.precision} isampler2D;
	precision ${J.precision} isampler3D;
	precision ${J.precision} isamplerCube;
	precision ${J.precision} isampler2DArray;
	precision ${J.precision} usampler2D;
	precision ${J.precision} usampler3D;
	precision ${J.precision} usamplerCube;
	precision ${J.precision} usampler2DArray;
	`;if(J.precision==="highp")Q+=`
#define HIGH_PRECISION`;else if(J.precision==="mediump")Q+=`
#define MEDIUM_PRECISION`;else if(J.precision==="lowp")Q+=`
#define LOW_PRECISION`;return Q}var Q1={[e7]:"SHADOWMAP_TYPE_PCF",[M7]:"SHADOWMAP_TYPE_VSM"};function $1(J){return Q1[J.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var Z1={[B7]:"ENVMAP_TYPE_CUBE",[T8]:"ENVMAP_TYPE_CUBE",[Q6]:"ENVMAP_TYPE_CUBE_UV"};function W1(J){if(J.envMap===!1)return"ENVMAP_TYPE_CUBE";return Z1[J.envMapMode]||"ENVMAP_TYPE_CUBE"}var K1={[T8]:"ENVMAP_MODE_REFRACTION"};function H1(J){if(J.envMap===!1)return"ENVMAP_MODE_REFLECTION";return K1[J.envMapMode]||"ENVMAP_MODE_REFLECTION"}var Y1={[EY]:"ENVMAP_BLENDING_MULTIPLY",[FY]:"ENVMAP_BLENDING_MIX",[DY]:"ENVMAP_BLENDING_ADD"};function X1(J){if(J.envMap===!1)return"ENVMAP_BLENDING_NONE";return Y1[J.combine]||"ENVMAP_BLENDING_NONE"}function U1(J){let Q=J.envMapCubeUVHeight;if(Q===null)return null;let $=Math.log2(Q)-2,Z=1/Q;return{texelWidth:1/(3*Math.max(Math.pow(2,$),112)),texelHeight:Z,maxMip:$}}function G1(J,Q,$,Z){let W=J.getContext(),K=$.defines,H=$.vertexShader,Y=$.fragmentShader,X=$1($),U=W1($),N=H1($),q=X1($),G=U1($),E=sD($),O=iD(K),R=W.createProgram(),D,F,M=$.glslVersion?"#version "+$.glslVersion+`
`:"";if($.isRawShaderMaterial){if(D=["#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,O].filter(L6).join(`
`),D.length>0)D+=`
`;if(F=["#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,O].filter(L6).join(`
`),F.length>0)F+=`
`}else D=[MU($),"#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,O,$.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",$.batching?"#define USE_BATCHING":"",$.batchingColor?"#define USE_BATCHING_COLOR":"",$.instancing?"#define USE_INSTANCING":"",$.instancingColor?"#define USE_INSTANCING_COLOR":"",$.instancingMorph?"#define USE_INSTANCING_MORPH":"",$.useFog&&$.fog?"#define USE_FOG":"",$.useFog&&$.fogExp2?"#define FOG_EXP2":"",$.map?"#define USE_MAP":"",$.envMap?"#define USE_ENVMAP":"",$.envMap?"#define "+N:"",$.lightMap?"#define USE_LIGHTMAP":"",$.aoMap?"#define USE_AOMAP":"",$.bumpMap?"#define USE_BUMPMAP":"",$.normalMap?"#define USE_NORMALMAP":"",$.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",$.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",$.displacementMap?"#define USE_DISPLACEMENTMAP":"",$.emissiveMap?"#define USE_EMISSIVEMAP":"",$.anisotropy?"#define USE_ANISOTROPY":"",$.anisotropyMap?"#define USE_ANISOTROPYMAP":"",$.clearcoatMap?"#define USE_CLEARCOATMAP":"",$.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",$.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",$.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",$.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",$.specularMap?"#define USE_SPECULARMAP":"",$.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",$.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",$.roughnessMap?"#define USE_ROUGHNESSMAP":"",$.metalnessMap?"#define USE_METALNESSMAP":"",$.alphaMap?"#define USE_ALPHAMAP":"",$.alphaHash?"#define USE_ALPHAHASH":"",$.transmission?"#define USE_TRANSMISSION":"",$.transmissionMap?"#define USE_TRANSMISSIONMAP":"",$.thicknessMap?"#define USE_THICKNESSMAP":"",$.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",$.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",$.mapUv?"#define MAP_UV "+$.mapUv:"",$.alphaMapUv?"#define ALPHAMAP_UV "+$.alphaMapUv:"",$.lightMapUv?"#define LIGHTMAP_UV "+$.lightMapUv:"",$.aoMapUv?"#define AOMAP_UV "+$.aoMapUv:"",$.emissiveMapUv?"#define EMISSIVEMAP_UV "+$.emissiveMapUv:"",$.bumpMapUv?"#define BUMPMAP_UV "+$.bumpMapUv:"",$.normalMapUv?"#define NORMALMAP_UV "+$.normalMapUv:"",$.displacementMapUv?"#define DISPLACEMENTMAP_UV "+$.displacementMapUv:"",$.metalnessMapUv?"#define METALNESSMAP_UV "+$.metalnessMapUv:"",$.roughnessMapUv?"#define ROUGHNESSMAP_UV "+$.roughnessMapUv:"",$.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+$.anisotropyMapUv:"",$.clearcoatMapUv?"#define CLEARCOATMAP_UV "+$.clearcoatMapUv:"",$.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+$.clearcoatNormalMapUv:"",$.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+$.clearcoatRoughnessMapUv:"",$.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+$.iridescenceMapUv:"",$.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+$.iridescenceThicknessMapUv:"",$.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+$.sheenColorMapUv:"",$.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+$.sheenRoughnessMapUv:"",$.specularMapUv?"#define SPECULARMAP_UV "+$.specularMapUv:"",$.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+$.specularColorMapUv:"",$.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+$.specularIntensityMapUv:"",$.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+$.transmissionMapUv:"",$.thicknessMapUv?"#define THICKNESSMAP_UV "+$.thicknessMapUv:"",$.vertexTangents&&$.flatShading===!1?"#define USE_TANGENT":"",$.vertexColors?"#define USE_COLOR":"",$.vertexAlphas?"#define USE_COLOR_ALPHA":"",$.vertexUv1s?"#define USE_UV1":"",$.vertexUv2s?"#define USE_UV2":"",$.vertexUv3s?"#define USE_UV3":"",$.pointsUvs?"#define USE_POINTS_UV":"",$.flatShading?"#define FLAT_SHADED":"",$.skinning?"#define USE_SKINNING":"",$.morphTargets?"#define USE_MORPHTARGETS":"",$.morphNormals&&$.flatShading===!1?"#define USE_MORPHNORMALS":"",$.morphColors?"#define USE_MORPHCOLORS":"",$.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+$.morphTextureStride:"",$.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+$.morphTargetsCount:"",$.doubleSided?"#define DOUBLE_SIDED":"",$.flipSided?"#define FLIP_SIDED":"",$.shadowMapEnabled?"#define USE_SHADOWMAP":"",$.shadowMapEnabled?"#define "+X:"",$.sizeAttenuation?"#define USE_SIZEATTENUATION":"",$.numLightProbes>0?"#define USE_LIGHT_PROBES":"",$.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",$.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","\tattribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","\tattribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","\tuniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","\tattribute vec2 uv1;","#endif","#ifdef USE_UV2","\tattribute vec2 uv2;","#endif","#ifdef USE_UV3","\tattribute vec2 uv3;","#endif","#ifdef USE_TANGENT","\tattribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","\tattribute vec4 color;","#elif defined( USE_COLOR )","\tattribute vec3 color;","#endif","#ifdef USE_SKINNING","\tattribute vec4 skinIndex;","\tattribute vec4 skinWeight;","#endif",`
`].filter(L6).join(`
`),F=[MU($),"#define SHADER_TYPE "+$.shaderType,"#define SHADER_NAME "+$.shaderName,O,$.useFog&&$.fog?"#define USE_FOG":"",$.useFog&&$.fogExp2?"#define FOG_EXP2":"",$.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",$.map?"#define USE_MAP":"",$.matcap?"#define USE_MATCAP":"",$.envMap?"#define USE_ENVMAP":"",$.envMap?"#define "+U:"",$.envMap?"#define "+N:"",$.envMap?"#define "+q:"",G?"#define CUBEUV_TEXEL_WIDTH "+G.texelWidth:"",G?"#define CUBEUV_TEXEL_HEIGHT "+G.texelHeight:"",G?"#define CUBEUV_MAX_MIP "+G.maxMip+".0":"",$.lightMap?"#define USE_LIGHTMAP":"",$.aoMap?"#define USE_AOMAP":"",$.bumpMap?"#define USE_BUMPMAP":"",$.normalMap?"#define USE_NORMALMAP":"",$.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",$.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",$.emissiveMap?"#define USE_EMISSIVEMAP":"",$.anisotropy?"#define USE_ANISOTROPY":"",$.anisotropyMap?"#define USE_ANISOTROPYMAP":"",$.clearcoat?"#define USE_CLEARCOAT":"",$.clearcoatMap?"#define USE_CLEARCOATMAP":"",$.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",$.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",$.dispersion?"#define USE_DISPERSION":"",$.iridescence?"#define USE_IRIDESCENCE":"",$.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",$.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",$.specularMap?"#define USE_SPECULARMAP":"",$.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",$.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",$.roughnessMap?"#define USE_ROUGHNESSMAP":"",$.metalnessMap?"#define USE_METALNESSMAP":"",$.alphaMap?"#define USE_ALPHAMAP":"",$.alphaTest?"#define USE_ALPHATEST":"",$.alphaHash?"#define USE_ALPHAHASH":"",$.sheen?"#define USE_SHEEN":"",$.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",$.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",$.transmission?"#define USE_TRANSMISSION":"",$.transmissionMap?"#define USE_TRANSMISSIONMAP":"",$.thicknessMap?"#define USE_THICKNESSMAP":"",$.vertexTangents&&$.flatShading===!1?"#define USE_TANGENT":"",$.vertexColors||$.instancingColor?"#define USE_COLOR":"",$.vertexAlphas||$.batchingColor?"#define USE_COLOR_ALPHA":"",$.vertexUv1s?"#define USE_UV1":"",$.vertexUv2s?"#define USE_UV2":"",$.vertexUv3s?"#define USE_UV3":"",$.pointsUvs?"#define USE_POINTS_UV":"",$.gradientMap?"#define USE_GRADIENTMAP":"",$.flatShading?"#define FLAT_SHADED":"",$.doubleSided?"#define DOUBLE_SIDED":"",$.flipSided?"#define FLIP_SIDED":"",$.shadowMapEnabled?"#define USE_SHADOWMAP":"",$.shadowMapEnabled?"#define "+X:"",$.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",$.numLightProbes>0?"#define USE_LIGHT_PROBES":"",$.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",$.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",$.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",$.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",$.toneMapping!==q9?"#define TONE_MAPPING":"",$.toneMapping!==q9?a0.tonemapping_pars_fragment:"",$.toneMapping!==q9?cD("toneMapping",$.toneMapping):"",$.dithering?"#define DITHERING":"",$.opaque?"#define OPAQUE":"",a0.colorspace_pars_fragment,lD("linearToOutputTexel",$.outputColorSpace),nD(),$.useDepthPacking?"#define DEPTH_PACKING "+$.depthPacking:"",`
`].filter(L6).join(`
`);if(H=RK(H),H=OU(H,$),H=RU(H,$),Y=RK(Y),Y=OU(Y,$),Y=RU(Y,$),H=kU(H),Y=kU(Y),$.isRawShaderMaterial!==!0)M=`#version 300 es
`,D=[E,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+D,F=["#define varying in",$.glslVersion===YW?"":"layout(location = 0) out highp vec4 pc_fragColor;",$.glslVersion===YW?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+F;let L=M+D+H,B=M+F+Y,P=EU(W,W.VERTEX_SHADER,L),C=EU(W,W.FRAGMENT_SHADER,B);if(W.attachShader(R,P),W.attachShader(R,C),$.index0AttributeName!==void 0)W.bindAttribLocation(R,0,$.index0AttributeName);else if($.morphTargets===!0)W.bindAttribLocation(R,0,"position");W.linkProgram(R);function w(S){if(J.debug.checkShaderErrors){let v=W.getProgramInfoLog(R)||"",l=W.getShaderInfoLog(P)||"",f=W.getShaderInfoLog(C)||"",c=v.trim(),x=l.trim(),m=f.trim(),Q0=!0,$0=!0;if(W.getProgramParameter(R,W.LINK_STATUS)===!1)if(Q0=!1,typeof J.debug.onShaderError==="function")J.debug.onShaderError(W,R,P,C);else{let U0=DU(W,P,"vertex"),_0=DU(W,C,"fragment");j0("THREE.WebGLProgram: Shader Error "+W.getError()+" - VALIDATE_STATUS "+W.getProgramParameter(R,W.VALIDATE_STATUS)+`

Material Name: `+S.name+`
Material Type: `+S.type+`

Program Info Log: `+c+`
`+U0+`
`+_0)}else if(c!=="")q0("WebGLProgram: Program Info Log:",c);else if(x===""||m==="")$0=!1;if($0)S.diagnostics={runnable:Q0,programLog:c,vertexShader:{log:x,prefix:D},fragmentShader:{log:m,prefix:F}}}W.deleteShader(P),W.deleteShader(C),k=new V6(W,R),A=oD(W,R)}let k;this.getUniforms=function(){if(k===void 0)w(this);return k};let A;this.getAttributes=function(){if(A===void 0)w(this);return A};let h=$.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){if(h===!1)h=W.getProgramParameter(R,gD);return h},this.destroy=function(){Z.releaseStatesOfProgram(this),W.deleteProgram(R),this.program=void 0},this.type=$.shaderType,this.name=$.shaderName,this.id=pD++,this.cacheKey=Q,this.usedTimes=1,this.program=R,this.vertexShader=P,this.fragmentShader=C,this}var N1=0;class jU{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(J){let{vertexShader:Q,fragmentShader:$}=J,Z=this._getShaderStage(Q),W=this._getShaderStage($),K=this._getShaderCacheForMaterial(J);if(K.has(Z)===!1)K.add(Z),Z.usedTimes++;if(K.has(W)===!1)K.add(W),W.usedTimes++;return this}remove(J){let Q=this.materialCache.get(J);for(let $ of Q)if($.usedTimes--,$.usedTimes===0)this.shaderCache.delete($.code);return this.materialCache.delete(J),this}getVertexShaderID(J){return this._getShaderStage(J.vertexShader).id}getFragmentShaderID(J){return this._getShaderStage(J.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(J){let Q=this.materialCache,$=Q.get(J);if($===void 0)$=new Set,Q.set(J,$);return $}_getShaderStage(J){let Q=this.shaderCache,$=Q.get(J);if($===void 0)$=new yU(J),Q.set(J,$);return $}}class yU{constructor(J){this.id=N1++,this.code=J,this.usedTimes=0}}function q1(J,Q,$,Z,W,K){let H=new Y6,Y=new jU,X=new Set,U=[],N=new Map,q=Z.logarithmicDepthBuffer,G=Z.precision,E={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function O(k){if(X.add(k),k===0)return"uv";return`uv${k}`}function R(k,A,h,S,v){let l=S.fog,f=v.geometry,c=k.isMeshStandardMaterial||k.isMeshLambertMaterial||k.isMeshPhongMaterial?S.environment:null,x=k.isMeshStandardMaterial||k.isMeshLambertMaterial&&!k.envMap||k.isMeshPhongMaterial&&!k.envMap,m=Q.get(k.envMap||c,x),Q0=!!m&&m.mapping===Q6?m.image.height:null,$0=E[k.type];if(k.precision!==null){if(G=Z.getMaxPrecision(k.precision),G!==k.precision)q0("WebGLProgram.getParameters:",k.precision,"not supported, using",G,"instead.")}let U0=f.morphAttributes.position||f.morphAttributes.normal||f.morphAttributes.color,_0=U0!==void 0?U0.length:0,K0=0;if(f.morphAttributes.position!==void 0)K0=1;if(f.morphAttributes.normal!==void 0)K0=2;if(f.morphAttributes.color!==void 0)K0=3;let KJ,WJ,i,G0;if($0){let YJ=A9[$0];KJ=YJ.vertexShader,WJ=YJ.fragmentShader}else KJ=k.vertexShader,WJ=k.fragmentShader,Y.update(k),i=Y.getVertexShaderID(k),G0=Y.getFragmentShaderID(k);let V0=J.getRenderTarget(),E0=J.state.buffers.depth.getReversed(),b0=v.isInstancedMesh===!0,e0=v.isBatchedMesh===!0,c0=!!k.map,s0=!!k.matcap,r=!!m,Z0=!!k.aoMap,e=!!k.lightMap,O0=!!k.bumpMap,T=!!k.normalMap,h0=!!k.displacementMap,N0=!!k.emissiveMap,x0=!!k.metalnessMap,H0=!!k.roughnessMap,d0=k.anisotropy>0,I=k.clearcoat>0,V=k.dispersion>0,b=k.iridescence>0,n=k.sheen>0,t=k.transmission>0,u=d0&&!!k.anisotropyMap,z0=I&&!!k.clearcoatMap,F0=I&&!!k.clearcoatNormalMap,S0=I&&!!k.clearcoatRoughnessMap,v0=b&&!!k.iridescenceMap,J0=b&&!!k.iridescenceThicknessMap,W0=n&&!!k.sheenColorMap,w0=n&&!!k.sheenRoughnessMap,g0=!!k.specularMap,L0=!!k.specularColorMap,r0=!!k.specularIntensityMap,j=t&&!!k.transmissionMap,Y0=t&&!!k.thicknessMap,X0=!!k.gradientMap,C0=!!k.alphaMap,o=k.alphaTest>0,a=!!k.alphaHash,A0=!!k.extensions,l0=q9;if(k.toneMapped){if(V0===null||V0.isXRRenderTarget===!0)l0=J.toneMapping}let FJ={shaderID:$0,shaderType:k.type,shaderName:k.name,vertexShader:KJ,fragmentShader:WJ,defines:k.defines,customVertexShaderID:i,customFragmentShaderID:G0,isRawShaderMaterial:k.isRawShaderMaterial===!0,glslVersion:k.glslVersion,precision:G,batching:e0,batchingColor:e0&&v._colorsTexture!==null,instancing:b0,instancingColor:b0&&v.instanceColor!==null,instancingMorph:b0&&v.morphTexture!==null,outputColorSpace:V0===null?J.outputColorSpace:V0.isXRRenderTarget===!0?V0.texture.colorSpace:W6,alphaToCoverage:!!k.alphaToCoverage,map:c0,matcap:s0,envMap:r,envMapMode:r&&m.mapping,envMapCubeUVHeight:Q0,aoMap:Z0,lightMap:e,bumpMap:O0,normalMap:T,displacementMap:h0,emissiveMap:N0,normalMapObjectSpace:T&&k.normalMapType===AY,normalMapTangentSpace:T&&k.normalMapType===wY,metalnessMap:x0,roughnessMap:H0,anisotropy:d0,anisotropyMap:u,clearcoat:I,clearcoatMap:z0,clearcoatNormalMap:F0,clearcoatRoughnessMap:S0,dispersion:V,iridescence:b,iridescenceMap:v0,iridescenceThicknessMap:J0,sheen:n,sheenColorMap:W0,sheenRoughnessMap:w0,specularMap:g0,specularColorMap:L0,specularIntensityMap:r0,transmission:t,transmissionMap:j,thicknessMap:Y0,gradientMap:X0,opaque:k.transparent===!1&&k.blending===J6&&k.alphaToCoverage===!1,alphaMap:C0,alphaTest:o,alphaHash:a,combine:k.combine,mapUv:c0&&O(k.map.channel),aoMapUv:Z0&&O(k.aoMap.channel),lightMapUv:e&&O(k.lightMap.channel),bumpMapUv:O0&&O(k.bumpMap.channel),normalMapUv:T&&O(k.normalMap.channel),displacementMapUv:h0&&O(k.displacementMap.channel),emissiveMapUv:N0&&O(k.emissiveMap.channel),metalnessMapUv:x0&&O(k.metalnessMap.channel),roughnessMapUv:H0&&O(k.roughnessMap.channel),anisotropyMapUv:u&&O(k.anisotropyMap.channel),clearcoatMapUv:z0&&O(k.clearcoatMap.channel),clearcoatNormalMapUv:F0&&O(k.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:S0&&O(k.clearcoatRoughnessMap.channel),iridescenceMapUv:v0&&O(k.iridescenceMap.channel),iridescenceThicknessMapUv:J0&&O(k.iridescenceThicknessMap.channel),sheenColorMapUv:W0&&O(k.sheenColorMap.channel),sheenRoughnessMapUv:w0&&O(k.sheenRoughnessMap.channel),specularMapUv:g0&&O(k.specularMap.channel),specularColorMapUv:L0&&O(k.specularColorMap.channel),specularIntensityMapUv:r0&&O(k.specularIntensityMap.channel),transmissionMapUv:j&&O(k.transmissionMap.channel),thicknessMapUv:Y0&&O(k.thicknessMap.channel),alphaMapUv:C0&&O(k.alphaMap.channel),vertexTangents:!!f.attributes.tangent&&(T||d0),vertexColors:k.vertexColors,vertexAlphas:k.vertexColors===!0&&!!f.attributes.color&&f.attributes.color.itemSize===4,pointsUvs:v.isPoints===!0&&!!f.attributes.uv&&(c0||C0),fog:!!l,useFog:k.fog===!0,fogExp2:!!l&&l.isFogExp2,flatShading:k.wireframe===!1&&(k.flatShading===!0||f.attributes.normal===void 0&&T===!1&&(k.isMeshLambertMaterial||k.isMeshPhongMaterial||k.isMeshStandardMaterial||k.isMeshPhysicalMaterial)),sizeAttenuation:k.sizeAttenuation===!0,logarithmicDepthBuffer:q,reversedDepthBuffer:E0,skinning:v.isSkinnedMesh===!0,morphTargets:f.morphAttributes.position!==void 0,morphNormals:f.morphAttributes.normal!==void 0,morphColors:f.morphAttributes.color!==void 0,morphTargetsCount:_0,morphTextureStride:K0,numDirLights:A.directional.length,numPointLights:A.point.length,numSpotLights:A.spot.length,numSpotLightMaps:A.spotLightMap.length,numRectAreaLights:A.rectArea.length,numHemiLights:A.hemi.length,numDirLightShadows:A.directionalShadowMap.length,numPointLightShadows:A.pointShadowMap.length,numSpotLightShadows:A.spotShadowMap.length,numSpotLightShadowsWithMaps:A.numSpotLightShadowsWithMaps,numLightProbes:A.numLightProbes,numClippingPlanes:K.numPlanes,numClipIntersection:K.numIntersection,dithering:k.dithering,shadowMapEnabled:J.shadowMap.enabled&&h.length>0,shadowMapType:J.shadowMap.type,toneMapping:l0,decodeVideoTexture:c0&&k.map.isVideoTexture===!0&&JJ.getTransfer(k.map.colorSpace)===EJ,decodeVideoTextureEmissive:N0&&k.emissiveMap.isVideoTexture===!0&&JJ.getTransfer(k.emissiveMap.colorSpace)===EJ,premultipliedAlpha:k.premultipliedAlpha,doubleSided:k.side===z9,flipSided:k.side===nJ,useDepthPacking:k.depthPacking>=0,depthPacking:k.depthPacking||0,index0AttributeName:k.index0AttributeName,extensionClipCullDistance:A0&&k.extensions.clipCullDistance===!0&&$.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(A0&&k.extensions.multiDraw===!0||e0)&&$.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:$.has("KHR_parallel_shader_compile"),customProgramCacheKey:k.customProgramCacheKey()};return FJ.vertexUv1s=X.has(1),FJ.vertexUv2s=X.has(2),FJ.vertexUv3s=X.has(3),X.clear(),FJ}function D(k){let A=[];if(k.shaderID)A.push(k.shaderID);else A.push(k.customVertexShaderID),A.push(k.customFragmentShaderID);if(k.defines!==void 0)for(let h in k.defines)A.push(h),A.push(k.defines[h]);if(k.isRawShaderMaterial===!1)F(A,k),M(A,k),A.push(J.outputColorSpace);return A.push(k.customProgramCacheKey),A.join()}function F(k,A){k.push(A.precision),k.push(A.outputColorSpace),k.push(A.envMapMode),k.push(A.envMapCubeUVHeight),k.push(A.mapUv),k.push(A.alphaMapUv),k.push(A.lightMapUv),k.push(A.aoMapUv),k.push(A.bumpMapUv),k.push(A.normalMapUv),k.push(A.displacementMapUv),k.push(A.emissiveMapUv),k.push(A.metalnessMapUv),k.push(A.roughnessMapUv),k.push(A.anisotropyMapUv),k.push(A.clearcoatMapUv),k.push(A.clearcoatNormalMapUv),k.push(A.clearcoatRoughnessMapUv),k.push(A.iridescenceMapUv),k.push(A.iridescenceThicknessMapUv),k.push(A.sheenColorMapUv),k.push(A.sheenRoughnessMapUv),k.push(A.specularMapUv),k.push(A.specularColorMapUv),k.push(A.specularIntensityMapUv),k.push(A.transmissionMapUv),k.push(A.thicknessMapUv),k.push(A.combine),k.push(A.fogExp2),k.push(A.sizeAttenuation),k.push(A.morphTargetsCount),k.push(A.morphAttributeCount),k.push(A.numDirLights),k.push(A.numPointLights),k.push(A.numSpotLights),k.push(A.numSpotLightMaps),k.push(A.numHemiLights),k.push(A.numRectAreaLights),k.push(A.numDirLightShadows),k.push(A.numPointLightShadows),k.push(A.numSpotLightShadows),k.push(A.numSpotLightShadowsWithMaps),k.push(A.numLightProbes),k.push(A.shadowMapType),k.push(A.toneMapping),k.push(A.numClippingPlanes),k.push(A.numClipIntersection),k.push(A.depthPacking)}function M(k,A){if(H.disableAll(),A.instancing)H.enable(0);if(A.instancingColor)H.enable(1);if(A.instancingMorph)H.enable(2);if(A.matcap)H.enable(3);if(A.envMap)H.enable(4);if(A.normalMapObjectSpace)H.enable(5);if(A.normalMapTangentSpace)H.enable(6);if(A.clearcoat)H.enable(7);if(A.iridescence)H.enable(8);if(A.alphaTest)H.enable(9);if(A.vertexColors)H.enable(10);if(A.vertexAlphas)H.enable(11);if(A.vertexUv1s)H.enable(12);if(A.vertexUv2s)H.enable(13);if(A.vertexUv3s)H.enable(14);if(A.vertexTangents)H.enable(15);if(A.anisotropy)H.enable(16);if(A.alphaHash)H.enable(17);if(A.batching)H.enable(18);if(A.dispersion)H.enable(19);if(A.batchingColor)H.enable(20);if(A.gradientMap)H.enable(21);if(k.push(H.mask),H.disableAll(),A.fog)H.enable(0);if(A.useFog)H.enable(1);if(A.flatShading)H.enable(2);if(A.logarithmicDepthBuffer)H.enable(3);if(A.reversedDepthBuffer)H.enable(4);if(A.skinning)H.enable(5);if(A.morphTargets)H.enable(6);if(A.morphNormals)H.enable(7);if(A.morphColors)H.enable(8);if(A.premultipliedAlpha)H.enable(9);if(A.shadowMapEnabled)H.enable(10);if(A.doubleSided)H.enable(11);if(A.flipSided)H.enable(12);if(A.useDepthPacking)H.enable(13);if(A.dithering)H.enable(14);if(A.transmission)H.enable(15);if(A.sheen)H.enable(16);if(A.opaque)H.enable(17);if(A.pointsUvs)H.enable(18);if(A.decodeVideoTexture)H.enable(19);if(A.decodeVideoTextureEmissive)H.enable(20);if(A.alphaToCoverage)H.enable(21);k.push(H.mask)}function L(k){let A=E[k.type],h;if(A){let S=A9[A];h=XX.clone(S.uniforms)}else h=k.uniforms;return h}function B(k,A){let h=N.get(A);if(h!==void 0)++h.usedTimes;else h=new G1(J,A,k,W),U.push(h),N.set(A,h);return h}function P(k){if(--k.usedTimes===0){let A=U.indexOf(k);U[A]=U[U.length-1],U.pop(),N.delete(k.cacheKey),k.destroy()}}function C(k){Y.remove(k)}function w(){Y.dispose()}return{getParameters:R,getProgramCacheKey:D,getUniforms:L,acquireProgram:B,releaseProgram:P,releaseShaderCache:C,programs:U,dispose:w}}function E1(){let J=new WeakMap;function Q(H){return J.has(H)}function $(H){let Y=J.get(H);if(Y===void 0)Y={},J.set(H,Y);return Y}function Z(H){J.delete(H)}function W(H,Y,X){J.get(H)[Y]=X}function K(){J=new WeakMap}return{has:Q,get:$,remove:Z,update:W,dispose:K}}function F1(J,Q){if(J.groupOrder!==Q.groupOrder)return J.groupOrder-Q.groupOrder;else if(J.renderOrder!==Q.renderOrder)return J.renderOrder-Q.renderOrder;else if(J.material.id!==Q.material.id)return J.material.id-Q.material.id;else if(J.materialVariant!==Q.materialVariant)return J.materialVariant-Q.materialVariant;else if(J.z!==Q.z)return J.z-Q.z;else return J.id-Q.id}function LU(J,Q){if(J.groupOrder!==Q.groupOrder)return J.groupOrder-Q.groupOrder;else if(J.renderOrder!==Q.renderOrder)return J.renderOrder-Q.renderOrder;else if(J.z!==Q.z)return Q.z-J.z;else return J.id-Q.id}function VU(){let J=[],Q=0,$=[],Z=[],W=[];function K(){Q=0,$.length=0,Z.length=0,W.length=0}function H(G){let E=0;if(G.isInstancedMesh)E+=2;if(G.isSkinnedMesh)E+=1;return E}function Y(G,E,O,R,D,F){let M=J[Q];if(M===void 0)M={id:G.id,object:G,geometry:E,material:O,materialVariant:H(G),groupOrder:R,renderOrder:G.renderOrder,z:D,group:F},J[Q]=M;else M.id=G.id,M.object=G,M.geometry=E,M.material=O,M.materialVariant=H(G),M.groupOrder=R,M.renderOrder=G.renderOrder,M.z=D,M.group=F;return Q++,M}function X(G,E,O,R,D,F){let M=Y(G,E,O,R,D,F);if(O.transmission>0)Z.push(M);else if(O.transparent===!0)W.push(M);else $.push(M)}function U(G,E,O,R,D,F){let M=Y(G,E,O,R,D,F);if(O.transmission>0)Z.unshift(M);else if(O.transparent===!0)W.unshift(M);else $.unshift(M)}function N(G,E){if($.length>1)$.sort(G||F1);if(Z.length>1)Z.sort(E||LU);if(W.length>1)W.sort(E||LU)}function q(){for(let G=Q,E=J.length;G<E;G++){let O=J[G];if(O.id===null)break;O.id=null,O.object=null,O.geometry=null,O.material=null,O.group=null}}return{opaque:$,transmissive:Z,transparent:W,init:K,push:X,unshift:U,finish:q,sort:N}}function D1(){let J=new WeakMap;function Q(Z,W){let K=J.get(Z),H;if(K===void 0)H=new VU,J.set(Z,[H]);else if(W>=K.length)H=new VU,K.push(H);else H=K[W];return H}function $(){J=new WeakMap}return{get:Q,dispose:$}}function O1(){let J={};return{get:function(Q){if(J[Q.id]!==void 0)return J[Q.id];let $;switch(Q.type){case"DirectionalLight":$={direction:new _,color:new M0};break;case"SpotLight":$={position:new _,direction:new _,color:new M0,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":$={position:new _,color:new M0,distance:0,decay:0};break;case"HemisphereLight":$={direction:new _,skyColor:new M0,groundColor:new M0};break;case"RectAreaLight":$={color:new M0,position:new _,halfWidth:new _,halfHeight:new _};break}return J[Q.id]=$,$}}}function R1(){let J={};return{get:function(Q){if(J[Q.id]!==void 0)return J[Q.id];let $;switch(Q.type){case"DirectionalLight":$={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new s};break;case"SpotLight":$={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new s};break;case"PointLight":$={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new s,shadowCameraNear:1,shadowCameraFar:1000};break}return J[Q.id]=$,$}}}var k1=0;function M1(J,Q){return(Q.castShadow?2:0)-(J.castShadow?2:0)+(Q.map?1:0)-(J.map?1:0)}function L1(J){let Q=new O1,$=R1(),Z={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let U=0;U<9;U++)Z.probe.push(new _);let W=new _,K=new m0,H=new m0;function Y(U){let N=0,q=0,G=0;for(let A=0;A<9;A++)Z.probe[A].set(0,0,0);let E=0,O=0,R=0,D=0,F=0,M=0,L=0,B=0,P=0,C=0,w=0;U.sort(M1);for(let A=0,h=U.length;A<h;A++){let S=U[A],v=S.color,l=S.intensity,f=S.distance,c=null;if(S.shadow&&S.shadow.map)if(S.shadow.map.texture.format===I7)c=S.shadow.map.texture;else c=S.shadow.map.depthTexture||S.shadow.map.texture;if(S.isAmbientLight)N+=v.r*l,q+=v.g*l,G+=v.b*l;else if(S.isLightProbe){for(let x=0;x<9;x++)Z.probe[x].addScaledVector(S.sh.coefficients[x],l);w++}else if(S.isDirectionalLight){let x=Q.get(S);if(x.color.copy(S.color).multiplyScalar(S.intensity),S.castShadow){let m=S.shadow,Q0=$.get(S);Q0.shadowIntensity=m.intensity,Q0.shadowBias=m.bias,Q0.shadowNormalBias=m.normalBias,Q0.shadowRadius=m.radius,Q0.shadowMapSize=m.mapSize,Z.directionalShadow[E]=Q0,Z.directionalShadowMap[E]=c,Z.directionalShadowMatrix[E]=S.shadow.matrix,M++}Z.directional[E]=x,E++}else if(S.isSpotLight){let x=Q.get(S);x.position.setFromMatrixPosition(S.matrixWorld),x.color.copy(v).multiplyScalar(l),x.distance=f,x.coneCos=Math.cos(S.angle),x.penumbraCos=Math.cos(S.angle*(1-S.penumbra)),x.decay=S.decay,Z.spot[R]=x;let m=S.shadow;if(S.map){if(Z.spotLightMap[P]=S.map,P++,m.updateMatrices(S),S.castShadow)C++}if(Z.spotLightMatrix[R]=m.matrix,S.castShadow){let Q0=$.get(S);Q0.shadowIntensity=m.intensity,Q0.shadowBias=m.bias,Q0.shadowNormalBias=m.normalBias,Q0.shadowRadius=m.radius,Q0.shadowMapSize=m.mapSize,Z.spotShadow[R]=Q0,Z.spotShadowMap[R]=c,B++}R++}else if(S.isRectAreaLight){let x=Q.get(S);x.color.copy(v).multiplyScalar(l),x.halfWidth.set(S.width*0.5,0,0),x.halfHeight.set(0,S.height*0.5,0),Z.rectArea[D]=x,D++}else if(S.isPointLight){let x=Q.get(S);if(x.color.copy(S.color).multiplyScalar(S.intensity),x.distance=S.distance,x.decay=S.decay,S.castShadow){let m=S.shadow,Q0=$.get(S);Q0.shadowIntensity=m.intensity,Q0.shadowBias=m.bias,Q0.shadowNormalBias=m.normalBias,Q0.shadowRadius=m.radius,Q0.shadowMapSize=m.mapSize,Q0.shadowCameraNear=m.camera.near,Q0.shadowCameraFar=m.camera.far,Z.pointShadow[O]=Q0,Z.pointShadowMap[O]=c,Z.pointShadowMatrix[O]=S.shadow.matrix,L++}Z.point[O]=x,O++}else if(S.isHemisphereLight){let x=Q.get(S);x.skyColor.copy(S.color).multiplyScalar(l),x.groundColor.copy(S.groundColor).multiplyScalar(l),Z.hemi[F]=x,F++}}if(D>0)if(J.has("OES_texture_float_linear")===!0)Z.rectAreaLTC1=D0.LTC_FLOAT_1,Z.rectAreaLTC2=D0.LTC_FLOAT_2;else Z.rectAreaLTC1=D0.LTC_HALF_1,Z.rectAreaLTC2=D0.LTC_HALF_2;Z.ambient[0]=N,Z.ambient[1]=q,Z.ambient[2]=G;let k=Z.hash;if(k.directionalLength!==E||k.pointLength!==O||k.spotLength!==R||k.rectAreaLength!==D||k.hemiLength!==F||k.numDirectionalShadows!==M||k.numPointShadows!==L||k.numSpotShadows!==B||k.numSpotMaps!==P||k.numLightProbes!==w)Z.directional.length=E,Z.spot.length=R,Z.rectArea.length=D,Z.point.length=O,Z.hemi.length=F,Z.directionalShadow.length=M,Z.directionalShadowMap.length=M,Z.pointShadow.length=L,Z.pointShadowMap.length=L,Z.spotShadow.length=B,Z.spotShadowMap.length=B,Z.directionalShadowMatrix.length=M,Z.pointShadowMatrix.length=L,Z.spotLightMatrix.length=B+P-C,Z.spotLightMap.length=P,Z.numSpotLightShadowsWithMaps=C,Z.numLightProbes=w,k.directionalLength=E,k.pointLength=O,k.spotLength=R,k.rectAreaLength=D,k.hemiLength=F,k.numDirectionalShadows=M,k.numPointShadows=L,k.numSpotShadows=B,k.numSpotMaps=P,k.numLightProbes=w,Z.version=k1++}function X(U,N){let q=0,G=0,E=0,O=0,R=0,D=N.matrixWorldInverse;for(let F=0,M=U.length;F<M;F++){let L=U[F];if(L.isDirectionalLight){let B=Z.directional[q];B.direction.setFromMatrixPosition(L.matrixWorld),W.setFromMatrixPosition(L.target.matrixWorld),B.direction.sub(W),B.direction.transformDirection(D),q++}else if(L.isSpotLight){let B=Z.spot[E];B.position.setFromMatrixPosition(L.matrixWorld),B.position.applyMatrix4(D),B.direction.setFromMatrixPosition(L.matrixWorld),W.setFromMatrixPosition(L.target.matrixWorld),B.direction.sub(W),B.direction.transformDirection(D),E++}else if(L.isRectAreaLight){let B=Z.rectArea[O];B.position.setFromMatrixPosition(L.matrixWorld),B.position.applyMatrix4(D),H.identity(),K.copy(L.matrixWorld),K.premultiply(D),H.extractRotation(K),B.halfWidth.set(L.width*0.5,0,0),B.halfHeight.set(0,L.height*0.5,0),B.halfWidth.applyMatrix4(H),B.halfHeight.applyMatrix4(H),O++}else if(L.isPointLight){let B=Z.point[G];B.position.setFromMatrixPosition(L.matrixWorld),B.position.applyMatrix4(D),G++}else if(L.isHemisphereLight){let B=Z.hemi[R];B.direction.setFromMatrixPosition(L.matrixWorld),B.direction.transformDirection(D),R++}}}return{setup:Y,setupView:X,state:Z}}function BU(J){let Q=new L1(J),$=[],Z=[];function W(N){U.camera=N,$.length=0,Z.length=0}function K(N){$.push(N)}function H(N){Z.push(N)}function Y(){Q.setup($)}function X(N){Q.setupView($,N)}let U={lightsArray:$,shadowsArray:Z,camera:null,lights:Q,transmissionRenderTarget:{}};return{init:W,state:U,setupLights:Y,setupLightsView:X,pushLight:K,pushShadow:H}}function V1(J){let Q=new WeakMap;function $(W,K=0){let H=Q.get(W),Y;if(H===void 0)Y=new BU(J),Q.set(W,[Y]);else if(K>=H.length)Y=new BU(J),H.push(Y);else Y=H[K];return Y}function Z(){Q=new WeakMap}return{get:$,dispose:Z}}var B1=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,z1=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,I1=[new _(1,0,0),new _(-1,0,0),new _(0,1,0),new _(0,-1,0),new _(0,0,1),new _(0,0,-1)],C1=[new _(0,-1,0),new _(0,-1,0),new _(0,0,1),new _(0,0,-1),new _(0,-1,0),new _(0,-1,0)],zU=new m0,M6=new _,FK=new _;function w1(J,Q,$){let Z=new b8,W=new s,K=new s,H=new qJ,Y=new W$,X=new K$,U={},N=$.maxTextureSize,q={[L7]:nJ,[nJ]:L7,[z9]:z9},G=new Q9({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new s},radius:{value:4}},vertexShader:B1,fragmentShader:z1}),E=G.clone();E.defines.HORIZONTAL_PASS=1;let O=new u0;O.setAttribute("position",new HJ(new Float32Array([-1,-1,0.5,3,-1,0.5,-1,3,0.5]),3));let R=new VJ(O,G),D=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=e7;let F=this.type;this.render=function(C,w,k){if(D.enabled===!1)return;if(D.autoUpdate===!1&&D.needsUpdate===!1)return;if(C.length===0)return;if(this.type===gH)q0("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=e7;let A=J.getRenderTarget(),h=J.getActiveCubeFace(),S=J.getActiveMipmapLevel(),v=J.state;if(v.setBlending(I9),v.buffers.depth.getReversed()===!0)v.buffers.color.setClear(0,0,0,0);else v.buffers.color.setClear(1,1,1,1);v.buffers.depth.setTest(!0),v.setScissorTest(!1);let l=F!==this.type;if(l)w.traverse(function(f){if(f.material)if(Array.isArray(f.material))f.material.forEach((c)=>c.needsUpdate=!0);else f.material.needsUpdate=!0});for(let f=0,c=C.length;f<c;f++){let x=C[f],m=x.shadow;if(m===void 0){q0("WebGLShadowMap:",x,"has no shadow.");continue}if(m.autoUpdate===!1&&m.needsUpdate===!1)continue;W.copy(m.mapSize);let Q0=m.getFrameExtents();if(W.multiply(Q0),K.copy(m.mapSize),W.x>N||W.y>N){if(W.x>N)K.x=Math.floor(N/Q0.x),W.x=K.x*Q0.x,m.mapSize.x=K.x;if(W.y>N)K.y=Math.floor(N/Q0.y),W.y=K.y*Q0.y,m.mapSize.y=K.y}let $0=J.state.buffers.depth.getReversed();if(m.camera._reversedDepth=$0,m.map===null||l===!0){if(m.map!==null){if(m.map.depthTexture!==null)m.map.depthTexture.dispose(),m.map.depthTexture=null;m.map.dispose()}if(this.type===M7){if(x.isPointLight){q0("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}m.map=new iJ(W.x,W.y,{format:I7,type:p9,minFilter:sJ,magFilter:sJ,generateMipmaps:!1}),m.map.texture.name=x.name+".shadowMap",m.map.depthTexture=new v8(W.x,W.y,g9),m.map.depthTexture.name=x.name+".shadowMapDepth",m.map.depthTexture.format=j8,m.map.depthTexture.compareFunction=null,m.map.depthTexture.minFilter=Z8,m.map.depthTexture.magFilter=Z8}else{if(x.isPointLight)m.map=new kK(W.x),m.map.depthTexture=new VW(W.x,W8);else m.map=new iJ(W.x,W.y),m.map.depthTexture=new v8(W.x,W.y,W8);if(m.map.depthTexture.name=x.name+".shadowMap",m.map.depthTexture.format=j8,this.type===e7)m.map.depthTexture.compareFunction=$0?AQ:wQ,m.map.depthTexture.minFilter=sJ,m.map.depthTexture.magFilter=sJ;else m.map.depthTexture.compareFunction=null,m.map.depthTexture.minFilter=Z8,m.map.depthTexture.magFilter=Z8}m.camera.updateProjectionMatrix()}let U0=m.map.isWebGLCubeRenderTarget?6:1;for(let _0=0;_0<U0;_0++){if(m.map.isWebGLCubeRenderTarget)J.setRenderTarget(m.map,_0),J.clear();else{if(_0===0)J.setRenderTarget(m.map),J.clear();let K0=m.getViewport(_0);H.set(K.x*K0.x,K.y*K0.y,K.x*K0.z,K.y*K0.w),v.viewport(H)}if(x.isPointLight){let{camera:K0,matrix:KJ}=m,WJ=x.distance||K0.far;if(WJ!==K0.far)K0.far=WJ,K0.updateProjectionMatrix();M6.setFromMatrixPosition(x.matrixWorld),K0.position.copy(M6),FK.copy(K0.position),FK.add(I1[_0]),K0.up.copy(C1[_0]),K0.lookAt(FK),K0.updateMatrixWorld(),KJ.makeTranslation(-M6.x,-M6.y,-M6.z),zU.multiplyMatrices(K0.projectionMatrix,K0.matrixWorldInverse),m._frustum.setFromProjectionMatrix(zU,K0.coordinateSystem,K0.reversedDepth)}else m.updateMatrices(x);Z=m.getFrustum(),B(w,k,m.camera,x,this.type)}if(m.isPointLightShadow!==!0&&this.type===M7)M(m,k);m.needsUpdate=!1}F=this.type,D.needsUpdate=!1,J.setRenderTarget(A,h,S)};function M(C,w){let k=Q.update(R);if(G.defines.VSM_SAMPLES!==C.blurSamples)G.defines.VSM_SAMPLES=C.blurSamples,E.defines.VSM_SAMPLES=C.blurSamples,G.needsUpdate=!0,E.needsUpdate=!0;if(C.mapPass===null)C.mapPass=new iJ(W.x,W.y,{format:I7,type:p9});G.uniforms.shadow_pass.value=C.map.depthTexture,G.uniforms.resolution.value=C.mapSize,G.uniforms.radius.value=C.radius,J.setRenderTarget(C.mapPass),J.clear(),J.renderBufferDirect(w,null,k,G,R,null),E.uniforms.shadow_pass.value=C.mapPass.texture,E.uniforms.resolution.value=C.mapSize,E.uniforms.radius.value=C.radius,J.setRenderTarget(C.map),J.clear(),J.renderBufferDirect(w,null,k,E,R,null)}function L(C,w,k,A){let h=null,S=k.isPointLight===!0?C.customDistanceMaterial:C.customDepthMaterial;if(S!==void 0)h=S;else if(h=k.isPointLight===!0?X:Y,J.localClippingEnabled&&w.clipShadows===!0&&Array.isArray(w.clippingPlanes)&&w.clippingPlanes.length!==0||w.displacementMap&&w.displacementScale!==0||w.alphaMap&&w.alphaTest>0||w.map&&w.alphaTest>0||w.alphaToCoverage===!0){let v=h.uuid,l=w.uuid,f=U[v];if(f===void 0)f={},U[v]=f;let c=f[l];if(c===void 0)c=h.clone(),f[l]=c,w.addEventListener("dispose",P);h=c}if(h.visible=w.visible,h.wireframe=w.wireframe,A===M7)h.side=w.shadowSide!==null?w.shadowSide:w.side;else h.side=w.shadowSide!==null?w.shadowSide:q[w.side];if(h.alphaMap=w.alphaMap,h.alphaTest=w.alphaToCoverage===!0?0.5:w.alphaTest,h.map=w.map,h.clipShadows=w.clipShadows,h.clippingPlanes=w.clippingPlanes,h.clipIntersection=w.clipIntersection,h.displacementMap=w.displacementMap,h.displacementScale=w.displacementScale,h.displacementBias=w.displacementBias,h.wireframeLinewidth=w.wireframeLinewidth,h.linewidth=w.linewidth,k.isPointLight===!0&&h.isMeshDistanceMaterial===!0){let v=J.properties.get(h);v.light=k}return h}function B(C,w,k,A,h){if(C.visible===!1)return;if(C.layers.test(w.layers)&&(C.isMesh||C.isLine||C.isPoints)){if((C.castShadow||C.receiveShadow&&h===M7)&&(!C.frustumCulled||Z.intersectsObject(C))){C.modelViewMatrix.multiplyMatrices(k.matrixWorldInverse,C.matrixWorld);let l=Q.update(C),f=C.material;if(Array.isArray(f)){let c=l.groups;for(let x=0,m=c.length;x<m;x++){let Q0=c[x],$0=f[Q0.materialIndex];if($0&&$0.visible){let U0=L(C,$0,A,h);C.onBeforeShadow(J,C,w,k,l,U0,Q0),J.renderBufferDirect(k,null,l,U0,C,Q0),C.onAfterShadow(J,C,w,k,l,U0,Q0)}}}else if(f.visible){let c=L(C,f,A,h);C.onBeforeShadow(J,C,w,k,l,c,null),J.renderBufferDirect(k,null,l,c,C,null),C.onAfterShadow(J,C,w,k,l,c,null)}}}let v=C.children;for(let l=0,f=v.length;l<f;l++)B(v[l],w,k,A,h)}function P(C){C.target.removeEventListener("dispose",P);for(let k in U){let A=U[k],h=C.target.uuid;if(h in A)A[h].dispose(),delete A[h]}}}function A1(J,Q){function $(){let j=!1,Y0=new qJ,X0=null,C0=new qJ(0,0,0,0);return{setMask:function(o){if(X0!==o&&!j)J.colorMask(o,o,o,o),X0=o},setLocked:function(o){j=o},setClear:function(o,a,A0,l0,FJ){if(FJ===!0)o*=l0,a*=l0,A0*=l0;if(Y0.set(o,a,A0,l0),C0.equals(Y0)===!1)J.clearColor(o,a,A0,l0),C0.copy(Y0)},reset:function(){j=!1,X0=null,C0.set(-1,0,0,0)}}}function Z(){let j=!1,Y0=!1,X0=null,C0=null,o=null;return{setReversed:function(a){if(Y0!==a){let A0=Q.get("EXT_clip_control");if(a)A0.clipControlEXT(A0.LOWER_LEFT_EXT,A0.ZERO_TO_ONE_EXT);else A0.clipControlEXT(A0.LOWER_LEFT_EXT,A0.NEGATIVE_ONE_TO_ONE_EXT);Y0=a;let l0=o;o=null,this.setClear(l0)}},getReversed:function(){return Y0},setTest:function(a){if(a)V0(J.DEPTH_TEST);else E0(J.DEPTH_TEST)},setMask:function(a){if(X0!==a&&!j)J.depthMask(a),X0=a},setFunc:function(a){if(Y0)a=gY[a];if(C0!==a){switch(a){case HY:J.depthFunc(J.NEVER);break;case YY:J.depthFunc(J.ALWAYS);break;case XY:J.depthFunc(J.LESS);break;case FZ:J.depthFunc(J.LEQUAL);break;case UY:J.depthFunc(J.EQUAL);break;case GY:J.depthFunc(J.GEQUAL);break;case NY:J.depthFunc(J.GREATER);break;case qY:J.depthFunc(J.NOTEQUAL);break;default:J.depthFunc(J.LEQUAL)}C0=a}},setLocked:function(a){j=a},setClear:function(a){if(o!==a){if(o=a,Y0)a=1-a;J.clearDepth(a)}},reset:function(){j=!1,X0=null,C0=null,o=null,Y0=!1}}}function W(){let j=!1,Y0=null,X0=null,C0=null,o=null,a=null,A0=null,l0=null,FJ=null;return{setTest:function(YJ){if(!j)if(YJ)V0(J.STENCIL_TEST);else E0(J.STENCIL_TEST)},setMask:function(YJ){if(Y0!==YJ&&!j)J.stencilMask(YJ),Y0=YJ},setFunc:function(YJ,_9,O9){if(X0!==YJ||C0!==_9||o!==O9)J.stencilFunc(YJ,_9,O9),X0=YJ,C0=_9,o=O9},setOp:function(YJ,_9,O9){if(a!==YJ||A0!==_9||l0!==O9)J.stencilOp(YJ,_9,O9),a=YJ,A0=_9,l0=O9},setLocked:function(YJ){j=YJ},setClear:function(YJ){if(FJ!==YJ)J.clearStencil(YJ),FJ=YJ},reset:function(){j=!1,Y0=null,X0=null,C0=null,o=null,a=null,A0=null,l0=null,FJ=null}}}let K=new $,H=new Z,Y=new W,X=new WeakMap,U=new WeakMap,N={},q={},G=new WeakMap,E=[],O=null,R=!1,D=null,F=null,M=null,L=null,B=null,P=null,C=null,w=new M0(0,0,0),k=0,A=!1,h=null,S=null,v=null,l=null,f=null,c=J.getParameter(J.MAX_COMBINED_TEXTURE_IMAGE_UNITS),x=!1,m=0,Q0=J.getParameter(J.VERSION);if(Q0.indexOf("WebGL")!==-1)m=parseFloat(/^WebGL (\d)/.exec(Q0)[1]),x=m>=1;else if(Q0.indexOf("OpenGL ES")!==-1)m=parseFloat(/^OpenGL ES (\d)/.exec(Q0)[1]),x=m>=2;let $0=null,U0={},_0=J.getParameter(J.SCISSOR_BOX),K0=J.getParameter(J.VIEWPORT),KJ=new qJ().fromArray(_0),WJ=new qJ().fromArray(K0);function i(j,Y0,X0,C0){let o=new Uint8Array(4),a=J.createTexture();J.bindTexture(j,a),J.texParameteri(j,J.TEXTURE_MIN_FILTER,J.NEAREST),J.texParameteri(j,J.TEXTURE_MAG_FILTER,J.NEAREST);for(let A0=0;A0<X0;A0++)if(j===J.TEXTURE_3D||j===J.TEXTURE_2D_ARRAY)J.texImage3D(Y0,0,J.RGBA,1,1,C0,0,J.RGBA,J.UNSIGNED_BYTE,o);else J.texImage2D(Y0+A0,0,J.RGBA,1,1,0,J.RGBA,J.UNSIGNED_BYTE,o);return a}let G0={};G0[J.TEXTURE_2D]=i(J.TEXTURE_2D,J.TEXTURE_2D,1),G0[J.TEXTURE_CUBE_MAP]=i(J.TEXTURE_CUBE_MAP,J.TEXTURE_CUBE_MAP_POSITIVE_X,6),G0[J.TEXTURE_2D_ARRAY]=i(J.TEXTURE_2D_ARRAY,J.TEXTURE_2D_ARRAY,1,1),G0[J.TEXTURE_3D]=i(J.TEXTURE_3D,J.TEXTURE_3D,1,1),K.setClear(0,0,0,1),H.setClear(1),Y.setClear(0),V0(J.DEPTH_TEST),H.setFunc(FZ),O0(!1),T(GZ),V0(J.CULL_FACE),Z0(I9);function V0(j){if(N[j]!==!0)J.enable(j),N[j]=!0}function E0(j){if(N[j]!==!1)J.disable(j),N[j]=!1}function b0(j,Y0){if(q[j]!==Y0){if(J.bindFramebuffer(j,Y0),q[j]=Y0,j===J.DRAW_FRAMEBUFFER)q[J.FRAMEBUFFER]=Y0;if(j===J.FRAMEBUFFER)q[J.DRAW_FRAMEBUFFER]=Y0;return!0}return!1}function e0(j,Y0){let X0=E,C0=!1;if(j){if(X0=G.get(Y0),X0===void 0)X0=[],G.set(Y0,X0);let o=j.textures;if(X0.length!==o.length||X0[0]!==J.COLOR_ATTACHMENT0){for(let a=0,A0=o.length;a<A0;a++)X0[a]=J.COLOR_ATTACHMENT0+a;X0.length=o.length,C0=!0}}else if(X0[0]!==J.BACK)X0[0]=J.BACK,C0=!0;if(C0)J.drawBuffers(X0)}function c0(j){if(O!==j)return J.useProgram(j),O=j,!0;return!1}let s0={[V7]:J.FUNC_ADD,[mH]:J.FUNC_SUBTRACT,[dH]:J.FUNC_REVERSE_SUBTRACT};s0[lH]=J.MIN,s0[uH]=J.MAX;let r={[cH]:J.ZERO,[nH]:J.ONE,[sH]:J.SRC_COLOR,[oH]:J.SRC_ALPHA,[QY]:J.SRC_ALPHA_SATURATE,[eH]:J.DST_COLOR,[rH]:J.DST_ALPHA,[iH]:J.ONE_MINUS_SRC_COLOR,[aH]:J.ONE_MINUS_SRC_ALPHA,[JY]:J.ONE_MINUS_DST_COLOR,[tH]:J.ONE_MINUS_DST_ALPHA,[$Y]:J.CONSTANT_COLOR,[ZY]:J.ONE_MINUS_CONSTANT_COLOR,[WY]:J.CONSTANT_ALPHA,[KY]:J.ONE_MINUS_CONSTANT_ALPHA};function Z0(j,Y0,X0,C0,o,a,A0,l0,FJ,YJ){if(j===I9){if(R===!0)E0(J.BLEND),R=!1;return}if(R===!1)V0(J.BLEND),R=!0;if(j!==pH){if(j!==D||YJ!==A){if(F!==V7||B!==V7)J.blendEquation(J.FUNC_ADD),F=V7,B=V7;if(YJ)switch(j){case J6:J.blendFuncSeparate(J.ONE,J.ONE_MINUS_SRC_ALPHA,J.ONE,J.ONE_MINUS_SRC_ALPHA);break;case NZ:J.blendFunc(J.ONE,J.ONE);break;case qZ:J.blendFuncSeparate(J.ZERO,J.ONE_MINUS_SRC_COLOR,J.ZERO,J.ONE);break;case EZ:J.blendFuncSeparate(J.DST_COLOR,J.ONE_MINUS_SRC_ALPHA,J.ZERO,J.ONE);break;default:j0("WebGLState: Invalid blending: ",j);break}else switch(j){case J6:J.blendFuncSeparate(J.SRC_ALPHA,J.ONE_MINUS_SRC_ALPHA,J.ONE,J.ONE_MINUS_SRC_ALPHA);break;case NZ:J.blendFuncSeparate(J.SRC_ALPHA,J.ONE,J.ONE,J.ONE);break;case qZ:j0("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case EZ:j0("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:j0("WebGLState: Invalid blending: ",j);break}M=null,L=null,P=null,C=null,w.set(0,0,0),k=0,D=j,A=YJ}return}if(o=o||Y0,a=a||X0,A0=A0||C0,Y0!==F||o!==B)J.blendEquationSeparate(s0[Y0],s0[o]),F=Y0,B=o;if(X0!==M||C0!==L||a!==P||A0!==C)J.blendFuncSeparate(r[X0],r[C0],r[a],r[A0]),M=X0,L=C0,P=a,C=A0;if(l0.equals(w)===!1||FJ!==k)J.blendColor(l0.r,l0.g,l0.b,FJ),w.copy(l0),k=FJ;D=j,A=!1}function e(j,Y0){j.side===z9?E0(J.CULL_FACE):V0(J.CULL_FACE);let X0=j.side===nJ;if(Y0)X0=!X0;O0(X0),j.blending===J6&&j.transparent===!1?Z0(I9):Z0(j.blending,j.blendEquation,j.blendSrc,j.blendDst,j.blendEquationAlpha,j.blendSrcAlpha,j.blendDstAlpha,j.blendColor,j.blendAlpha,j.premultipliedAlpha),H.setFunc(j.depthFunc),H.setTest(j.depthTest),H.setMask(j.depthWrite),K.setMask(j.colorWrite);let C0=j.stencilWrite;if(Y.setTest(C0),C0)Y.setMask(j.stencilWriteMask),Y.setFunc(j.stencilFunc,j.stencilRef,j.stencilFuncMask),Y.setOp(j.stencilFail,j.stencilZFail,j.stencilZPass);N0(j.polygonOffset,j.polygonOffsetFactor,j.polygonOffsetUnits),j.alphaToCoverage===!0?V0(J.SAMPLE_ALPHA_TO_COVERAGE):E0(J.SAMPLE_ALPHA_TO_COVERAGE)}function O0(j){if(h!==j){if(j)J.frontFace(J.CW);else J.frontFace(J.CCW);h=j}}function T(j){if(j!==hH){if(V0(J.CULL_FACE),j!==S)if(j===GZ)J.cullFace(J.BACK);else if(j===xH)J.cullFace(J.FRONT);else J.cullFace(J.FRONT_AND_BACK)}else E0(J.CULL_FACE);S=j}function h0(j){if(j!==v){if(x)J.lineWidth(j);v=j}}function N0(j,Y0,X0){if(j){if(V0(J.POLYGON_OFFSET_FILL),l!==Y0||f!==X0){if(l=Y0,f=X0,H.getReversed())Y0=-Y0;J.polygonOffset(Y0,X0)}}else E0(J.POLYGON_OFFSET_FILL)}function x0(j){if(j)V0(J.SCISSOR_TEST);else E0(J.SCISSOR_TEST)}function H0(j){if(j===void 0)j=J.TEXTURE0+c-1;if($0!==j)J.activeTexture(j),$0=j}function d0(j,Y0,X0){if(X0===void 0)if($0===null)X0=J.TEXTURE0+c-1;else X0=$0;let C0=U0[X0];if(C0===void 0)C0={type:void 0,texture:void 0},U0[X0]=C0;if(C0.type!==j||C0.texture!==Y0){if($0!==X0)J.activeTexture(X0),$0=X0;J.bindTexture(j,Y0||G0[j]),C0.type=j,C0.texture=Y0}}function I(){let j=U0[$0];if(j!==void 0&&j.type!==void 0)J.bindTexture(j.type,null),j.type=void 0,j.texture=void 0}function V(){try{J.compressedTexImage2D(...arguments)}catch(j){j0("WebGLState:",j)}}function b(){try{J.compressedTexImage3D(...arguments)}catch(j){j0("WebGLState:",j)}}function n(){try{J.texSubImage2D(...arguments)}catch(j){j0("WebGLState:",j)}}function t(){try{J.texSubImage3D(...arguments)}catch(j){j0("WebGLState:",j)}}function u(){try{J.compressedTexSubImage2D(...arguments)}catch(j){j0("WebGLState:",j)}}function z0(){try{J.compressedTexSubImage3D(...arguments)}catch(j){j0("WebGLState:",j)}}function F0(){try{J.texStorage2D(...arguments)}catch(j){j0("WebGLState:",j)}}function S0(){try{J.texStorage3D(...arguments)}catch(j){j0("WebGLState:",j)}}function v0(){try{J.texImage2D(...arguments)}catch(j){j0("WebGLState:",j)}}function J0(){try{J.texImage3D(...arguments)}catch(j){j0("WebGLState:",j)}}function W0(j){if(KJ.equals(j)===!1)J.scissor(j.x,j.y,j.z,j.w),KJ.copy(j)}function w0(j){if(WJ.equals(j)===!1)J.viewport(j.x,j.y,j.z,j.w),WJ.copy(j)}function g0(j,Y0){let X0=U.get(Y0);if(X0===void 0)X0=new WeakMap,U.set(Y0,X0);let C0=X0.get(j);if(C0===void 0)C0=J.getUniformBlockIndex(Y0,j.name),X0.set(j,C0)}function L0(j,Y0){let C0=U.get(Y0).get(j);if(X.get(Y0)!==C0)J.uniformBlockBinding(Y0,C0,j.__bindingPointIndex),X.set(Y0,C0)}function r0(){J.disable(J.BLEND),J.disable(J.CULL_FACE),J.disable(J.DEPTH_TEST),J.disable(J.POLYGON_OFFSET_FILL),J.disable(J.SCISSOR_TEST),J.disable(J.STENCIL_TEST),J.disable(J.SAMPLE_ALPHA_TO_COVERAGE),J.blendEquation(J.FUNC_ADD),J.blendFunc(J.ONE,J.ZERO),J.blendFuncSeparate(J.ONE,J.ZERO,J.ONE,J.ZERO),J.blendColor(0,0,0,0),J.colorMask(!0,!0,!0,!0),J.clearColor(0,0,0,0),J.depthMask(!0),J.depthFunc(J.LESS),H.setReversed(!1),J.clearDepth(1),J.stencilMask(4294967295),J.stencilFunc(J.ALWAYS,0,4294967295),J.stencilOp(J.KEEP,J.KEEP,J.KEEP),J.clearStencil(0),J.cullFace(J.BACK),J.frontFace(J.CCW),J.polygonOffset(0,0),J.activeTexture(J.TEXTURE0),J.bindFramebuffer(J.FRAMEBUFFER,null),J.bindFramebuffer(J.DRAW_FRAMEBUFFER,null),J.bindFramebuffer(J.READ_FRAMEBUFFER,null),J.useProgram(null),J.lineWidth(1),J.scissor(0,0,J.canvas.width,J.canvas.height),J.viewport(0,0,J.canvas.width,J.canvas.height),N={},$0=null,U0={},q={},G=new WeakMap,E=[],O=null,R=!1,D=null,F=null,M=null,L=null,B=null,P=null,C=null,w=new M0(0,0,0),k=0,A=!1,h=null,S=null,v=null,l=null,f=null,KJ.set(0,0,J.canvas.width,J.canvas.height),WJ.set(0,0,J.canvas.width,J.canvas.height),K.reset(),H.reset(),Y.reset()}return{buffers:{color:K,depth:H,stencil:Y},enable:V0,disable:E0,bindFramebuffer:b0,drawBuffers:e0,useProgram:c0,setBlending:Z0,setMaterial:e,setFlipSided:O0,setCullFace:T,setLineWidth:h0,setPolygonOffset:N0,setScissorTest:x0,activeTexture:H0,bindTexture:d0,unbindTexture:I,compressedTexImage2D:V,compressedTexImage3D:b,texImage2D:v0,texImage3D:J0,updateUBOMapping:g0,uniformBlockBinding:L0,texStorage2D:F0,texStorage3D:S0,texSubImage2D:n,texSubImage3D:t,compressedTexSubImage2D:u,compressedTexSubImage3D:z0,scissor:W0,viewport:w0,reset:r0}}function _1(J,Q,$,Z,W,K,H){let Y=Q.has("WEBGL_multisampled_render_to_texture")?Q.get("WEBGL_multisampled_render_to_texture"):null,X=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),U=new s,N=new WeakMap,q,G=new WeakMap,E=!1;try{E=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch(I){}function O(I,V){return E?new OffscreenCanvas(I,V):E7("canvas")}function R(I,V,b){let n=1,t=d0(I);if(t.width>b||t.height>b)n=b/Math.max(t.width,t.height);if(n<1)if(typeof HTMLImageElement<"u"&&I instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&I instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&I instanceof ImageBitmap||typeof VideoFrame<"u"&&I instanceof VideoFrame){let u=Math.floor(n*t.width),z0=Math.floor(n*t.height);if(q===void 0)q=O(u,z0);let F0=V?O(u,z0):q;return F0.width=u,F0.height=z0,F0.getContext("2d").drawImage(I,0,0,u,z0),q0("WebGLRenderer: Texture has been resized from ("+t.width+"x"+t.height+") to ("+u+"x"+z0+")."),F0}else{if("data"in I)q0("WebGLRenderer: Image in DataTexture is too big ("+t.width+"x"+t.height+").");return I}return I}function D(I){return I.generateMipmaps}function F(I){J.generateMipmap(I)}function M(I){if(I.isWebGLCubeRenderTarget)return J.TEXTURE_CUBE_MAP;if(I.isWebGL3DRenderTarget)return J.TEXTURE_3D;if(I.isWebGLArrayRenderTarget||I.isCompressedArrayTexture)return J.TEXTURE_2D_ARRAY;return J.TEXTURE_2D}function L(I,V,b,n,t=!1){if(I!==null){if(J[I]!==void 0)return J[I];q0("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+I+"'")}let u=V;if(V===J.RED){if(b===J.FLOAT)u=J.R32F;if(b===J.HALF_FLOAT)u=J.R16F;if(b===J.UNSIGNED_BYTE)u=J.R8}if(V===J.RED_INTEGER){if(b===J.UNSIGNED_BYTE)u=J.R8UI;if(b===J.UNSIGNED_SHORT)u=J.R16UI;if(b===J.UNSIGNED_INT)u=J.R32UI;if(b===J.BYTE)u=J.R8I;if(b===J.SHORT)u=J.R16I;if(b===J.INT)u=J.R32I}if(V===J.RG){if(b===J.FLOAT)u=J.RG32F;if(b===J.HALF_FLOAT)u=J.RG16F;if(b===J.UNSIGNED_BYTE)u=J.RG8}if(V===J.RG_INTEGER){if(b===J.UNSIGNED_BYTE)u=J.RG8UI;if(b===J.UNSIGNED_SHORT)u=J.RG16UI;if(b===J.UNSIGNED_INT)u=J.RG32UI;if(b===J.BYTE)u=J.RG8I;if(b===J.SHORT)u=J.RG16I;if(b===J.INT)u=J.RG32I}if(V===J.RGB_INTEGER){if(b===J.UNSIGNED_BYTE)u=J.RGB8UI;if(b===J.UNSIGNED_SHORT)u=J.RGB16UI;if(b===J.UNSIGNED_INT)u=J.RGB32UI;if(b===J.BYTE)u=J.RGB8I;if(b===J.SHORT)u=J.RGB16I;if(b===J.INT)u=J.RGB32I}if(V===J.RGBA_INTEGER){if(b===J.UNSIGNED_BYTE)u=J.RGBA8UI;if(b===J.UNSIGNED_SHORT)u=J.RGBA16UI;if(b===J.UNSIGNED_INT)u=J.RGBA32UI;if(b===J.BYTE)u=J.RGBA8I;if(b===J.SHORT)u=J.RGBA16I;if(b===J.INT)u=J.RGBA32I}if(V===J.RGB){if(b===J.UNSIGNED_INT_5_9_9_9_REV)u=J.RGB9_E5;if(b===J.UNSIGNED_INT_10F_11F_11F_REV)u=J.R11F_G11F_B10F}if(V===J.RGBA){let z0=t?HW:JJ.getTransfer(n);if(b===J.FLOAT)u=J.RGBA32F;if(b===J.HALF_FLOAT)u=J.RGBA16F;if(b===J.UNSIGNED_BYTE)u=z0===EJ?J.SRGB8_ALPHA8:J.RGBA8;if(b===J.UNSIGNED_SHORT_4_4_4_4)u=J.RGBA4;if(b===J.UNSIGNED_SHORT_5_5_5_1)u=J.RGB5_A1}if(u===J.R16F||u===J.R32F||u===J.RG16F||u===J.RG32F||u===J.RGBA16F||u===J.RGBA32F)Q.get("EXT_color_buffer_float");return u}function B(I,V){let b;if(I){if(V===null||V===W8||V===z7)b=J.DEPTH24_STENCIL8;else if(V===g9)b=J.DEPTH32F_STENCIL8;else if(V===Z6)b=J.DEPTH24_STENCIL8,q0("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")}else if(V===null||V===W8||V===z7)b=J.DEPTH_COMPONENT24;else if(V===g9)b=J.DEPTH_COMPONENT32F;else if(V===Z6)b=J.DEPTH_COMPONENT16;return b}function P(I,V){if(D(I)===!0||I.isFramebufferTexture&&I.minFilter!==Z8&&I.minFilter!==sJ)return Math.log2(Math.max(V.width,V.height))+1;else if(I.mipmaps!==void 0&&I.mipmaps.length>0)return I.mipmaps.length;else if(I.isCompressedTexture&&Array.isArray(I.image))return V.mipmaps.length;else return 1}function C(I){let V=I.target;if(V.removeEventListener("dispose",C),k(V),V.isVideoTexture)N.delete(V)}function w(I){let V=I.target;V.removeEventListener("dispose",w),h(V)}function k(I){let V=Z.get(I);if(V.__webglInit===void 0)return;let b=I.source,n=G.get(b);if(n){let t=n[V.__cacheKey];if(t.usedTimes--,t.usedTimes===0)A(I);if(Object.keys(n).length===0)G.delete(b)}Z.remove(I)}function A(I){let V=Z.get(I);J.deleteTexture(V.__webglTexture);let b=I.source,n=G.get(b);delete n[V.__cacheKey],H.memory.textures--}function h(I){let V=Z.get(I);if(I.depthTexture)I.depthTexture.dispose(),Z.remove(I.depthTexture);if(I.isWebGLCubeRenderTarget)for(let n=0;n<6;n++){if(Array.isArray(V.__webglFramebuffer[n]))for(let t=0;t<V.__webglFramebuffer[n].length;t++)J.deleteFramebuffer(V.__webglFramebuffer[n][t]);else J.deleteFramebuffer(V.__webglFramebuffer[n]);if(V.__webglDepthbuffer)J.deleteRenderbuffer(V.__webglDepthbuffer[n])}else{if(Array.isArray(V.__webglFramebuffer))for(let n=0;n<V.__webglFramebuffer.length;n++)J.deleteFramebuffer(V.__webglFramebuffer[n]);else J.deleteFramebuffer(V.__webglFramebuffer);if(V.__webglDepthbuffer)J.deleteRenderbuffer(V.__webglDepthbuffer);if(V.__webglMultisampledFramebuffer)J.deleteFramebuffer(V.__webglMultisampledFramebuffer);if(V.__webglColorRenderbuffer){for(let n=0;n<V.__webglColorRenderbuffer.length;n++)if(V.__webglColorRenderbuffer[n])J.deleteRenderbuffer(V.__webglColorRenderbuffer[n])}if(V.__webglDepthRenderbuffer)J.deleteRenderbuffer(V.__webglDepthRenderbuffer)}let b=I.textures;for(let n=0,t=b.length;n<t;n++){let u=Z.get(b[n]);if(u.__webglTexture)J.deleteTexture(u.__webglTexture),H.memory.textures--;Z.remove(b[n])}Z.remove(I)}let S=0;function v(){S=0}function l(){let I=S;if(I>=W.maxTextures)q0("WebGLTextures: Trying to use "+I+" texture units while this GPU supports only "+W.maxTextures);return S+=1,I}function f(I){let V=[];return V.push(I.wrapS),V.push(I.wrapT),V.push(I.wrapR||0),V.push(I.magFilter),V.push(I.minFilter),V.push(I.anisotropy),V.push(I.internalFormat),V.push(I.format),V.push(I.type),V.push(I.generateMipmaps),V.push(I.premultiplyAlpha),V.push(I.flipY),V.push(I.unpackAlignment),V.push(I.colorSpace),V.join()}function c(I,V){let b=Z.get(I);if(I.isVideoTexture)x0(I);if(I.isRenderTargetTexture===!1&&I.isExternalTexture!==!0&&I.version>0&&b.__version!==I.version){let n=I.image;if(n===null)q0("WebGLRenderer: Texture marked for update but no image data found.");else if(n.complete===!1)q0("WebGLRenderer: Texture marked for update but image is incomplete");else{G0(b,I,V);return}}else if(I.isExternalTexture)b.__webglTexture=I.sourceTexture?I.sourceTexture:null;$.bindTexture(J.TEXTURE_2D,b.__webglTexture,J.TEXTURE0+V)}function x(I,V){let b=Z.get(I);if(I.isRenderTargetTexture===!1&&I.version>0&&b.__version!==I.version){G0(b,I,V);return}else if(I.isExternalTexture)b.__webglTexture=I.sourceTexture?I.sourceTexture:null;$.bindTexture(J.TEXTURE_2D_ARRAY,b.__webglTexture,J.TEXTURE0+V)}function m(I,V){let b=Z.get(I);if(I.isRenderTargetTexture===!1&&I.version>0&&b.__version!==I.version){G0(b,I,V);return}$.bindTexture(J.TEXTURE_3D,b.__webglTexture,J.TEXTURE0+V)}function Q0(I,V){let b=Z.get(I);if(I.isCubeDepthTexture!==!0&&I.version>0&&b.__version!==I.version){V0(b,I,V);return}$.bindTexture(J.TEXTURE_CUBE_MAP,b.__webglTexture,J.TEXTURE0+V)}let $0={[OY]:J.REPEAT,[LQ]:J.CLAMP_TO_EDGE,[RY]:J.MIRRORED_REPEAT},U0={[Z8]:J.NEAREST,[kY]:J.NEAREST_MIPMAP_NEAREST,[$6]:J.NEAREST_MIPMAP_LINEAR,[sJ]:J.LINEAR,[VQ]:J.LINEAR_MIPMAP_NEAREST,[S8]:J.LINEAR_MIPMAP_LINEAR},_0={[PY]:J.NEVER,[fY]:J.ALWAYS,[TY]:J.LESS,[wQ]:J.LEQUAL,[SY]:J.EQUAL,[AQ]:J.GEQUAL,[jY]:J.GREATER,[yY]:J.NOTEQUAL};function K0(I,V){if(V.type===g9&&Q.has("OES_texture_float_linear")===!1&&(V.magFilter===sJ||V.magFilter===VQ||V.magFilter===$6||V.magFilter===S8||V.minFilter===sJ||V.minFilter===VQ||V.minFilter===$6||V.minFilter===S8))q0("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.");if(J.texParameteri(I,J.TEXTURE_WRAP_S,$0[V.wrapS]),J.texParameteri(I,J.TEXTURE_WRAP_T,$0[V.wrapT]),I===J.TEXTURE_3D||I===J.TEXTURE_2D_ARRAY)J.texParameteri(I,J.TEXTURE_WRAP_R,$0[V.wrapR]);if(J.texParameteri(I,J.TEXTURE_MAG_FILTER,U0[V.magFilter]),J.texParameteri(I,J.TEXTURE_MIN_FILTER,U0[V.minFilter]),V.compareFunction)J.texParameteri(I,J.TEXTURE_COMPARE_MODE,J.COMPARE_REF_TO_TEXTURE),J.texParameteri(I,J.TEXTURE_COMPARE_FUNC,_0[V.compareFunction]);if(Q.has("EXT_texture_filter_anisotropic")===!0){if(V.magFilter===Z8)return;if(V.minFilter!==$6&&V.minFilter!==S8)return;if(V.type===g9&&Q.has("OES_texture_float_linear")===!1)return;if(V.anisotropy>1||Z.get(V).__currentAnisotropy){let b=Q.get("EXT_texture_filter_anisotropic");J.texParameterf(I,b.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(V.anisotropy,W.getMaxAnisotropy())),Z.get(V).__currentAnisotropy=V.anisotropy}}}function KJ(I,V){let b=!1;if(I.__webglInit===void 0)I.__webglInit=!0,V.addEventListener("dispose",C);let n=V.source,t=G.get(n);if(t===void 0)t={},G.set(n,t);let u=f(V);if(u!==I.__cacheKey){if(t[u]===void 0)t[u]={texture:J.createTexture(),usedTimes:0},H.memory.textures++,b=!0;t[u].usedTimes++;let z0=t[I.__cacheKey];if(z0!==void 0){if(t[I.__cacheKey].usedTimes--,z0.usedTimes===0)A(V)}I.__cacheKey=u,I.__webglTexture=t[u].texture}return b}function WJ(I,V,b){return Math.floor(Math.floor(I/b)/V)}function i(I,V,b,n){let u=I.updateRanges;if(u.length===0)$.texSubImage2D(J.TEXTURE_2D,0,0,0,V.width,V.height,b,n,V.data);else{u.sort((J0,W0)=>J0.start-W0.start);let z0=0;for(let J0=1;J0<u.length;J0++){let W0=u[z0],w0=u[J0],g0=W0.start+W0.count,L0=WJ(w0.start,V.width,4),r0=WJ(W0.start,V.width,4);if(w0.start<=g0+1&&L0===r0&&WJ(w0.start+w0.count-1,V.width,4)===L0)W0.count=Math.max(W0.count,w0.start+w0.count-W0.start);else++z0,u[z0]=w0}u.length=z0+1;let F0=J.getParameter(J.UNPACK_ROW_LENGTH),S0=J.getParameter(J.UNPACK_SKIP_PIXELS),v0=J.getParameter(J.UNPACK_SKIP_ROWS);J.pixelStorei(J.UNPACK_ROW_LENGTH,V.width);for(let J0=0,W0=u.length;J0<W0;J0++){let w0=u[J0],g0=Math.floor(w0.start/4),L0=Math.ceil(w0.count/4),r0=g0%V.width,j=Math.floor(g0/V.width),Y0=L0,X0=1;J.pixelStorei(J.UNPACK_SKIP_PIXELS,r0),J.pixelStorei(J.UNPACK_SKIP_ROWS,j),$.texSubImage2D(J.TEXTURE_2D,0,r0,j,Y0,1,b,n,V.data)}I.clearUpdateRanges(),J.pixelStorei(J.UNPACK_ROW_LENGTH,F0),J.pixelStorei(J.UNPACK_SKIP_PIXELS,S0),J.pixelStorei(J.UNPACK_SKIP_ROWS,v0)}}function G0(I,V,b){let n=J.TEXTURE_2D;if(V.isDataArrayTexture||V.isCompressedArrayTexture)n=J.TEXTURE_2D_ARRAY;if(V.isData3DTexture)n=J.TEXTURE_3D;let t=KJ(I,V),u=V.source;$.bindTexture(n,I.__webglTexture,J.TEXTURE0+b);let z0=Z.get(u);if(u.version!==z0.__version||t===!0){$.activeTexture(J.TEXTURE0+b);let F0=JJ.getPrimaries(JJ.workingColorSpace),S0=V.colorSpace===f8?null:JJ.getPrimaries(V.colorSpace),v0=V.colorSpace===f8||F0===S0?J.NONE:J.BROWSER_DEFAULT_WEBGL;J.pixelStorei(J.UNPACK_FLIP_Y_WEBGL,V.flipY),J.pixelStorei(J.UNPACK_PREMULTIPLY_ALPHA_WEBGL,V.premultiplyAlpha),J.pixelStorei(J.UNPACK_ALIGNMENT,V.unpackAlignment),J.pixelStorei(J.UNPACK_COLORSPACE_CONVERSION_WEBGL,v0);let J0=R(V.image,!1,W.maxTextureSize);J0=H0(V,J0);let W0=K.convert(V.format,V.colorSpace),w0=K.convert(V.type),g0=L(V.internalFormat,W0,w0,V.colorSpace,V.isVideoTexture);K0(n,V);let L0,r0=V.mipmaps,j=V.isVideoTexture!==!0,Y0=z0.__version===void 0||t===!0,X0=u.dataReady,C0=P(V,J0);if(V.isDepthTexture){if(g0=B(V.format===y8,V.type),Y0)if(j)$.texStorage2D(J.TEXTURE_2D,1,g0,J0.width,J0.height);else $.texImage2D(J.TEXTURE_2D,0,g0,J0.width,J0.height,0,W0,w0,null)}else if(V.isDataTexture)if(r0.length>0){if(j&&Y0)$.texStorage2D(J.TEXTURE_2D,C0,g0,r0[0].width,r0[0].height);for(let o=0,a=r0.length;o<a;o++)if(L0=r0[o],j){if(X0)$.texSubImage2D(J.TEXTURE_2D,o,0,0,L0.width,L0.height,W0,w0,L0.data)}else $.texImage2D(J.TEXTURE_2D,o,g0,L0.width,L0.height,0,W0,w0,L0.data);V.generateMipmaps=!1}else if(j){if(Y0)$.texStorage2D(J.TEXTURE_2D,C0,g0,J0.width,J0.height);if(X0)i(V,J0,W0,w0)}else $.texImage2D(J.TEXTURE_2D,0,g0,J0.width,J0.height,0,W0,w0,J0.data);else if(V.isCompressedTexture)if(V.isCompressedArrayTexture){if(j&&Y0)$.texStorage3D(J.TEXTURE_2D_ARRAY,C0,g0,r0[0].width,r0[0].height,J0.depth);for(let o=0,a=r0.length;o<a;o++)if(L0=r0[o],V.format!==C9)if(W0!==null)if(j){if(X0)if(V.layerUpdates.size>0){let A0=F$(L0.width,L0.height,V.format,V.type);for(let l0 of V.layerUpdates){let FJ=L0.data.subarray(l0*A0/L0.data.BYTES_PER_ELEMENT,(l0+1)*A0/L0.data.BYTES_PER_ELEMENT);$.compressedTexSubImage3D(J.TEXTURE_2D_ARRAY,o,0,0,l0,L0.width,L0.height,1,W0,FJ)}V.clearLayerUpdates()}else $.compressedTexSubImage3D(J.TEXTURE_2D_ARRAY,o,0,0,0,L0.width,L0.height,J0.depth,W0,L0.data)}else $.compressedTexImage3D(J.TEXTURE_2D_ARRAY,o,g0,L0.width,L0.height,J0.depth,0,L0.data,0,0);else q0("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else if(j){if(X0)$.texSubImage3D(J.TEXTURE_2D_ARRAY,o,0,0,0,L0.width,L0.height,J0.depth,W0,w0,L0.data)}else $.texImage3D(J.TEXTURE_2D_ARRAY,o,g0,L0.width,L0.height,J0.depth,0,W0,w0,L0.data)}else{if(j&&Y0)$.texStorage2D(J.TEXTURE_2D,C0,g0,r0[0].width,r0[0].height);for(let o=0,a=r0.length;o<a;o++)if(L0=r0[o],V.format!==C9)if(W0!==null)if(j){if(X0)$.compressedTexSubImage2D(J.TEXTURE_2D,o,0,0,L0.width,L0.height,W0,L0.data)}else $.compressedTexImage2D(J.TEXTURE_2D,o,g0,L0.width,L0.height,0,L0.data);else q0("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else if(j){if(X0)$.texSubImage2D(J.TEXTURE_2D,o,0,0,L0.width,L0.height,W0,w0,L0.data)}else $.texImage2D(J.TEXTURE_2D,o,g0,L0.width,L0.height,0,W0,w0,L0.data)}else if(V.isDataArrayTexture)if(j){if(Y0)$.texStorage3D(J.TEXTURE_2D_ARRAY,C0,g0,J0.width,J0.height,J0.depth);if(X0)if(V.layerUpdates.size>0){let o=F$(J0.width,J0.height,V.format,V.type);for(let a of V.layerUpdates){let A0=J0.data.subarray(a*o/J0.data.BYTES_PER_ELEMENT,(a+1)*o/J0.data.BYTES_PER_ELEMENT);$.texSubImage3D(J.TEXTURE_2D_ARRAY,0,0,0,a,J0.width,J0.height,1,W0,w0,A0)}V.clearLayerUpdates()}else $.texSubImage3D(J.TEXTURE_2D_ARRAY,0,0,0,0,J0.width,J0.height,J0.depth,W0,w0,J0.data)}else $.texImage3D(J.TEXTURE_2D_ARRAY,0,g0,J0.width,J0.height,J0.depth,0,W0,w0,J0.data);else if(V.isData3DTexture)if(j){if(Y0)$.texStorage3D(J.TEXTURE_3D,C0,g0,J0.width,J0.height,J0.depth);if(X0)$.texSubImage3D(J.TEXTURE_3D,0,0,0,0,J0.width,J0.height,J0.depth,W0,w0,J0.data)}else $.texImage3D(J.TEXTURE_3D,0,g0,J0.width,J0.height,J0.depth,0,W0,w0,J0.data);else if(V.isFramebufferTexture){if(Y0)if(j)$.texStorage2D(J.TEXTURE_2D,C0,g0,J0.width,J0.height);else{let{width:o,height:a}=J0;for(let A0=0;A0<C0;A0++)$.texImage2D(J.TEXTURE_2D,A0,g0,o,a,0,W0,w0,null),o>>=1,a>>=1}}else if(r0.length>0){if(j&&Y0){let o=d0(r0[0]);$.texStorage2D(J.TEXTURE_2D,C0,g0,o.width,o.height)}for(let o=0,a=r0.length;o<a;o++)if(L0=r0[o],j){if(X0)$.texSubImage2D(J.TEXTURE_2D,o,0,0,W0,w0,L0)}else $.texImage2D(J.TEXTURE_2D,o,g0,W0,w0,L0);V.generateMipmaps=!1}else if(j){if(Y0){let o=d0(J0);$.texStorage2D(J.TEXTURE_2D,C0,g0,o.width,o.height)}if(X0)$.texSubImage2D(J.TEXTURE_2D,0,0,0,W0,w0,J0)}else $.texImage2D(J.TEXTURE_2D,0,g0,W0,w0,J0);if(D(V))F(n);if(z0.__version=u.version,V.onUpdate)V.onUpdate(V)}I.__version=V.version}function V0(I,V,b){if(V.image.length!==6)return;let n=KJ(I,V),t=V.source;$.bindTexture(J.TEXTURE_CUBE_MAP,I.__webglTexture,J.TEXTURE0+b);let u=Z.get(t);if(t.version!==u.__version||n===!0){$.activeTexture(J.TEXTURE0+b);let z0=JJ.getPrimaries(JJ.workingColorSpace),F0=V.colorSpace===f8?null:JJ.getPrimaries(V.colorSpace),S0=V.colorSpace===f8||z0===F0?J.NONE:J.BROWSER_DEFAULT_WEBGL;J.pixelStorei(J.UNPACK_FLIP_Y_WEBGL,V.flipY),J.pixelStorei(J.UNPACK_PREMULTIPLY_ALPHA_WEBGL,V.premultiplyAlpha),J.pixelStorei(J.UNPACK_ALIGNMENT,V.unpackAlignment),J.pixelStorei(J.UNPACK_COLORSPACE_CONVERSION_WEBGL,S0);let v0=V.isCompressedTexture||V.image[0].isCompressedTexture,J0=V.image[0]&&V.image[0].isDataTexture,W0=[];for(let a=0;a<6;a++){if(!v0&&!J0)W0[a]=R(V.image[a],!0,W.maxCubemapSize);else W0[a]=J0?V.image[a].image:V.image[a];W0[a]=H0(V,W0[a])}let w0=W0[0],g0=K.convert(V.format,V.colorSpace),L0=K.convert(V.type),r0=L(V.internalFormat,g0,L0,V.colorSpace),j=V.isVideoTexture!==!0,Y0=u.__version===void 0||n===!0,X0=t.dataReady,C0=P(V,w0);K0(J.TEXTURE_CUBE_MAP,V);let o;if(v0){if(j&&Y0)$.texStorage2D(J.TEXTURE_CUBE_MAP,C0,r0,w0.width,w0.height);for(let a=0;a<6;a++){o=W0[a].mipmaps;for(let A0=0;A0<o.length;A0++){let l0=o[A0];if(V.format!==C9)if(g0!==null)if(j){if(X0)$.compressedTexSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+a,A0,0,0,l0.width,l0.height,g0,l0.data)}else $.compressedTexImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+a,A0,r0,l0.width,l0.height,0,l0.data);else q0("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()");else if(j){if(X0)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+a,A0,0,0,l0.width,l0.height,g0,L0,l0.data)}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+a,A0,r0,l0.width,l0.height,0,g0,L0,l0.data)}}}else{if(o=V.mipmaps,j&&Y0){if(o.length>0)C0++;let a=d0(W0[0]);$.texStorage2D(J.TEXTURE_CUBE_MAP,C0,r0,a.width,a.height)}for(let a=0;a<6;a++)if(J0){if(j){if(X0)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+a,0,0,0,W0[a].width,W0[a].height,g0,L0,W0[a].data)}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+a,0,r0,W0[a].width,W0[a].height,0,g0,L0,W0[a].data);for(let A0=0;A0<o.length;A0++){let FJ=o[A0].image[a].image;if(j){if(X0)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+a,A0+1,0,0,FJ.width,FJ.height,g0,L0,FJ.data)}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+a,A0+1,r0,FJ.width,FJ.height,0,g0,L0,FJ.data)}}else{if(j){if(X0)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+a,0,0,0,g0,L0,W0[a])}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+a,0,r0,g0,L0,W0[a]);for(let A0=0;A0<o.length;A0++){let l0=o[A0];if(j){if(X0)$.texSubImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+a,A0+1,0,0,g0,L0,l0.image[a])}else $.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+a,A0+1,r0,g0,L0,l0.image[a])}}}if(D(V))F(J.TEXTURE_CUBE_MAP);if(u.__version=t.version,V.onUpdate)V.onUpdate(V)}I.__version=V.version}function E0(I,V,b,n,t,u){let z0=K.convert(b.format,b.colorSpace),F0=K.convert(b.type),S0=L(b.internalFormat,z0,F0,b.colorSpace),v0=Z.get(V),J0=Z.get(b);if(J0.__renderTarget=V,!v0.__hasExternalTextures){let W0=Math.max(1,V.width>>u),w0=Math.max(1,V.height>>u);if(t===J.TEXTURE_3D||t===J.TEXTURE_2D_ARRAY)$.texImage3D(t,u,S0,W0,w0,V.depth,0,z0,F0,null);else $.texImage2D(t,u,S0,W0,w0,0,z0,F0,null)}if($.bindFramebuffer(J.FRAMEBUFFER,I),N0(V))Y.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,n,t,J0.__webglTexture,0,h0(V));else if(t===J.TEXTURE_2D||t>=J.TEXTURE_CUBE_MAP_POSITIVE_X&&t<=J.TEXTURE_CUBE_MAP_NEGATIVE_Z)J.framebufferTexture2D(J.FRAMEBUFFER,n,t,J0.__webglTexture,u);$.bindFramebuffer(J.FRAMEBUFFER,null)}function b0(I,V,b){if(J.bindRenderbuffer(J.RENDERBUFFER,I),V.depthBuffer){let n=V.depthTexture,t=n&&n.isDepthTexture?n.type:null,u=B(V.stencilBuffer,t),z0=V.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT;if(N0(V))Y.renderbufferStorageMultisampleEXT(J.RENDERBUFFER,h0(V),u,V.width,V.height);else if(b)J.renderbufferStorageMultisample(J.RENDERBUFFER,h0(V),u,V.width,V.height);else J.renderbufferStorage(J.RENDERBUFFER,u,V.width,V.height);J.framebufferRenderbuffer(J.FRAMEBUFFER,z0,J.RENDERBUFFER,I)}else{let n=V.textures;for(let t=0;t<n.length;t++){let u=n[t],z0=K.convert(u.format,u.colorSpace),F0=K.convert(u.type),S0=L(u.internalFormat,z0,F0,u.colorSpace);if(N0(V))Y.renderbufferStorageMultisampleEXT(J.RENDERBUFFER,h0(V),S0,V.width,V.height);else if(b)J.renderbufferStorageMultisample(J.RENDERBUFFER,h0(V),S0,V.width,V.height);else J.renderbufferStorage(J.RENDERBUFFER,S0,V.width,V.height)}}J.bindRenderbuffer(J.RENDERBUFFER,null)}function e0(I,V,b){let n=V.isWebGLCubeRenderTarget===!0;if($.bindFramebuffer(J.FRAMEBUFFER,I),!(V.depthTexture&&V.depthTexture.isDepthTexture))throw Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");let t=Z.get(V.depthTexture);if(t.__renderTarget=V,!t.__webglTexture||V.depthTexture.image.width!==V.width||V.depthTexture.image.height!==V.height)V.depthTexture.image.width=V.width,V.depthTexture.image.height=V.height,V.depthTexture.needsUpdate=!0;if(n){if(t.__webglInit===void 0)t.__webglInit=!0,V.depthTexture.addEventListener("dispose",C);if(t.__webglTexture===void 0){t.__webglTexture=J.createTexture(),$.bindTexture(J.TEXTURE_CUBE_MAP,t.__webglTexture),K0(J.TEXTURE_CUBE_MAP,V.depthTexture);let v0=K.convert(V.depthTexture.format),J0=K.convert(V.depthTexture.type),W0;if(V.depthTexture.format===j8)W0=J.DEPTH_COMPONENT24;else if(V.depthTexture.format===y8)W0=J.DEPTH24_STENCIL8;for(let w0=0;w0<6;w0++)J.texImage2D(J.TEXTURE_CUBE_MAP_POSITIVE_X+w0,0,W0,V.width,V.height,0,v0,J0,null)}}else c(V.depthTexture,0);let u=t.__webglTexture,z0=h0(V),F0=n?J.TEXTURE_CUBE_MAP_POSITIVE_X+b:J.TEXTURE_2D,S0=V.depthTexture.format===y8?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT;if(V.depthTexture.format===j8)if(N0(V))Y.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,S0,F0,u,0,z0);else J.framebufferTexture2D(J.FRAMEBUFFER,S0,F0,u,0);else if(V.depthTexture.format===y8)if(N0(V))Y.framebufferTexture2DMultisampleEXT(J.FRAMEBUFFER,S0,F0,u,0,z0);else J.framebufferTexture2D(J.FRAMEBUFFER,S0,F0,u,0);else throw Error("Unknown depthTexture format")}function c0(I){let V=Z.get(I),b=I.isWebGLCubeRenderTarget===!0;if(V.__boundDepthTexture!==I.depthTexture){let n=I.depthTexture;if(V.__depthDisposeCallback)V.__depthDisposeCallback();if(n){let t=()=>{delete V.__boundDepthTexture,delete V.__depthDisposeCallback,n.removeEventListener("dispose",t)};n.addEventListener("dispose",t),V.__depthDisposeCallback=t}V.__boundDepthTexture=n}if(I.depthTexture&&!V.__autoAllocateDepthBuffer)if(b)for(let n=0;n<6;n++)e0(V.__webglFramebuffer[n],I,n);else{let n=I.texture.mipmaps;if(n&&n.length>0)e0(V.__webglFramebuffer[0],I,0);else e0(V.__webglFramebuffer,I,0)}else if(b){V.__webglDepthbuffer=[];for(let n=0;n<6;n++)if($.bindFramebuffer(J.FRAMEBUFFER,V.__webglFramebuffer[n]),V.__webglDepthbuffer[n]===void 0)V.__webglDepthbuffer[n]=J.createRenderbuffer(),b0(V.__webglDepthbuffer[n],I,!1);else{let t=I.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,u=V.__webglDepthbuffer[n];J.bindRenderbuffer(J.RENDERBUFFER,u),J.framebufferRenderbuffer(J.FRAMEBUFFER,t,J.RENDERBUFFER,u)}}else{let n=I.texture.mipmaps;if(n&&n.length>0)$.bindFramebuffer(J.FRAMEBUFFER,V.__webglFramebuffer[0]);else $.bindFramebuffer(J.FRAMEBUFFER,V.__webglFramebuffer);if(V.__webglDepthbuffer===void 0)V.__webglDepthbuffer=J.createRenderbuffer(),b0(V.__webglDepthbuffer,I,!1);else{let t=I.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,u=V.__webglDepthbuffer;J.bindRenderbuffer(J.RENDERBUFFER,u),J.framebufferRenderbuffer(J.FRAMEBUFFER,t,J.RENDERBUFFER,u)}}$.bindFramebuffer(J.FRAMEBUFFER,null)}function s0(I,V,b){let n=Z.get(I);if(V!==void 0)E0(n.__webglFramebuffer,I,I.texture,J.COLOR_ATTACHMENT0,J.TEXTURE_2D,0);if(b!==void 0)c0(I)}function r(I){let V=I.texture,b=Z.get(I),n=Z.get(V);I.addEventListener("dispose",w);let t=I.textures,u=I.isWebGLCubeRenderTarget===!0,z0=t.length>1;if(!z0){if(n.__webglTexture===void 0)n.__webglTexture=J.createTexture();n.__version=V.version,H.memory.textures++}if(u){b.__webglFramebuffer=[];for(let F0=0;F0<6;F0++)if(V.mipmaps&&V.mipmaps.length>0){b.__webglFramebuffer[F0]=[];for(let S0=0;S0<V.mipmaps.length;S0++)b.__webglFramebuffer[F0][S0]=J.createFramebuffer()}else b.__webglFramebuffer[F0]=J.createFramebuffer()}else{if(V.mipmaps&&V.mipmaps.length>0){b.__webglFramebuffer=[];for(let F0=0;F0<V.mipmaps.length;F0++)b.__webglFramebuffer[F0]=J.createFramebuffer()}else b.__webglFramebuffer=J.createFramebuffer();if(z0)for(let F0=0,S0=t.length;F0<S0;F0++){let v0=Z.get(t[F0]);if(v0.__webglTexture===void 0)v0.__webglTexture=J.createTexture(),H.memory.textures++}if(I.samples>0&&N0(I)===!1){b.__webglMultisampledFramebuffer=J.createFramebuffer(),b.__webglColorRenderbuffer=[],$.bindFramebuffer(J.FRAMEBUFFER,b.__webglMultisampledFramebuffer);for(let F0=0;F0<t.length;F0++){let S0=t[F0];b.__webglColorRenderbuffer[F0]=J.createRenderbuffer(),J.bindRenderbuffer(J.RENDERBUFFER,b.__webglColorRenderbuffer[F0]);let v0=K.convert(S0.format,S0.colorSpace),J0=K.convert(S0.type),W0=L(S0.internalFormat,v0,J0,S0.colorSpace,I.isXRRenderTarget===!0),w0=h0(I);J.renderbufferStorageMultisample(J.RENDERBUFFER,w0,W0,I.width,I.height),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+F0,J.RENDERBUFFER,b.__webglColorRenderbuffer[F0])}if(J.bindRenderbuffer(J.RENDERBUFFER,null),I.depthBuffer)b.__webglDepthRenderbuffer=J.createRenderbuffer(),b0(b.__webglDepthRenderbuffer,I,!0);$.bindFramebuffer(J.FRAMEBUFFER,null)}}if(u){$.bindTexture(J.TEXTURE_CUBE_MAP,n.__webglTexture),K0(J.TEXTURE_CUBE_MAP,V);for(let F0=0;F0<6;F0++)if(V.mipmaps&&V.mipmaps.length>0)for(let S0=0;S0<V.mipmaps.length;S0++)E0(b.__webglFramebuffer[F0][S0],I,V,J.COLOR_ATTACHMENT0,J.TEXTURE_CUBE_MAP_POSITIVE_X+F0,S0);else E0(b.__webglFramebuffer[F0],I,V,J.COLOR_ATTACHMENT0,J.TEXTURE_CUBE_MAP_POSITIVE_X+F0,0);if(D(V))F(J.TEXTURE_CUBE_MAP);$.unbindTexture()}else if(z0){for(let F0=0,S0=t.length;F0<S0;F0++){let v0=t[F0],J0=Z.get(v0),W0=J.TEXTURE_2D;if(I.isWebGL3DRenderTarget||I.isWebGLArrayRenderTarget)W0=I.isWebGL3DRenderTarget?J.TEXTURE_3D:J.TEXTURE_2D_ARRAY;if($.bindTexture(W0,J0.__webglTexture),K0(W0,v0),E0(b.__webglFramebuffer,I,v0,J.COLOR_ATTACHMENT0+F0,W0,0),D(v0))F(W0)}$.unbindTexture()}else{let F0=J.TEXTURE_2D;if(I.isWebGL3DRenderTarget||I.isWebGLArrayRenderTarget)F0=I.isWebGL3DRenderTarget?J.TEXTURE_3D:J.TEXTURE_2D_ARRAY;if($.bindTexture(F0,n.__webglTexture),K0(F0,V),V.mipmaps&&V.mipmaps.length>0)for(let S0=0;S0<V.mipmaps.length;S0++)E0(b.__webglFramebuffer[S0],I,V,J.COLOR_ATTACHMENT0,F0,S0);else E0(b.__webglFramebuffer,I,V,J.COLOR_ATTACHMENT0,F0,0);if(D(V))F(F0);$.unbindTexture()}if(I.depthBuffer)c0(I)}function Z0(I){let V=I.textures;for(let b=0,n=V.length;b<n;b++){let t=V[b];if(D(t)){let u=M(I),z0=Z.get(t).__webglTexture;$.bindTexture(u,z0),F(u),$.unbindTexture()}}}let e=[],O0=[];function T(I){if(I.samples>0){if(N0(I)===!1){let{textures:V,width:b,height:n}=I,t=J.COLOR_BUFFER_BIT,u=I.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT,z0=Z.get(I),F0=V.length>1;if(F0)for(let v0=0;v0<V.length;v0++)$.bindFramebuffer(J.FRAMEBUFFER,z0.__webglMultisampledFramebuffer),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+v0,J.RENDERBUFFER,null),$.bindFramebuffer(J.FRAMEBUFFER,z0.__webglFramebuffer),J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0+v0,J.TEXTURE_2D,null,0);$.bindFramebuffer(J.READ_FRAMEBUFFER,z0.__webglMultisampledFramebuffer);let S0=I.texture.mipmaps;if(S0&&S0.length>0)$.bindFramebuffer(J.DRAW_FRAMEBUFFER,z0.__webglFramebuffer[0]);else $.bindFramebuffer(J.DRAW_FRAMEBUFFER,z0.__webglFramebuffer);for(let v0=0;v0<V.length;v0++){if(I.resolveDepthBuffer){if(I.depthBuffer)t|=J.DEPTH_BUFFER_BIT;if(I.stencilBuffer&&I.resolveStencilBuffer)t|=J.STENCIL_BUFFER_BIT}if(F0){J.framebufferRenderbuffer(J.READ_FRAMEBUFFER,J.COLOR_ATTACHMENT0,J.RENDERBUFFER,z0.__webglColorRenderbuffer[v0]);let J0=Z.get(V[v0]).__webglTexture;J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0,J.TEXTURE_2D,J0,0)}if(J.blitFramebuffer(0,0,b,n,0,0,b,n,t,J.NEAREST),X===!0){if(e.length=0,O0.length=0,e.push(J.COLOR_ATTACHMENT0+v0),I.depthBuffer&&I.resolveDepthBuffer===!1)e.push(u),O0.push(u),J.invalidateFramebuffer(J.DRAW_FRAMEBUFFER,O0);J.invalidateFramebuffer(J.READ_FRAMEBUFFER,e)}}if($.bindFramebuffer(J.READ_FRAMEBUFFER,null),$.bindFramebuffer(J.DRAW_FRAMEBUFFER,null),F0)for(let v0=0;v0<V.length;v0++){$.bindFramebuffer(J.FRAMEBUFFER,z0.__webglMultisampledFramebuffer),J.framebufferRenderbuffer(J.FRAMEBUFFER,J.COLOR_ATTACHMENT0+v0,J.RENDERBUFFER,z0.__webglColorRenderbuffer[v0]);let J0=Z.get(V[v0]).__webglTexture;$.bindFramebuffer(J.FRAMEBUFFER,z0.__webglFramebuffer),J.framebufferTexture2D(J.DRAW_FRAMEBUFFER,J.COLOR_ATTACHMENT0+v0,J.TEXTURE_2D,J0,0)}$.bindFramebuffer(J.DRAW_FRAMEBUFFER,z0.__webglMultisampledFramebuffer)}else if(I.depthBuffer&&I.resolveDepthBuffer===!1&&X){let V=I.stencilBuffer?J.DEPTH_STENCIL_ATTACHMENT:J.DEPTH_ATTACHMENT;J.invalidateFramebuffer(J.DRAW_FRAMEBUFFER,[V])}}}function h0(I){return Math.min(W.maxSamples,I.samples)}function N0(I){let V=Z.get(I);return I.samples>0&&Q.has("WEBGL_multisampled_render_to_texture")===!0&&V.__useRenderToTexture!==!1}function x0(I){let V=H.render.frame;if(N.get(I)!==V)N.set(I,V),I.update()}function H0(I,V){let{colorSpace:b,format:n,type:t}=I;if(I.isCompressedTexture===!0||I.isVideoTexture===!0)return V;if(b!==W6&&b!==f8)if(JJ.getTransfer(b)===EJ){if(n!==C9||t!==E9)q0("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.")}else j0("WebGLTextures: Unsupported texture color space:",b);return V}function d0(I){if(typeof HTMLImageElement<"u"&&I instanceof HTMLImageElement)U.width=I.naturalWidth||I.width,U.height=I.naturalHeight||I.height;else if(typeof VideoFrame<"u"&&I instanceof VideoFrame)U.width=I.displayWidth,U.height=I.displayHeight;else U.width=I.width,U.height=I.height;return U}this.allocateTextureUnit=l,this.resetTextureUnits=v,this.setTexture2D=c,this.setTexture2DArray=x,this.setTexture3D=m,this.setTextureCube=Q0,this.rebindTextures=s0,this.setupRenderTarget=r,this.updateRenderTargetMipmap=Z0,this.updateMultisampleRenderTarget=T,this.setupDepthRenderbuffer=c0,this.setupFrameBufferTexture=E0,this.useMultisampledRTT=N0,this.isReversedDepthBuffer=function(){return $.buffers.depth.getReversed()}}function P1(J,Q){function $(Z,W=f8){let K,H=JJ.getTransfer(W);if(Z===E9)return J.UNSIGNED_BYTE;if(Z===zZ)return J.UNSIGNED_SHORT_4_4_4_4;if(Z===IZ)return J.UNSIGNED_SHORT_5_5_5_1;if(Z===VY)return J.UNSIGNED_INT_5_9_9_9_REV;if(Z===BY)return J.UNSIGNED_INT_10F_11F_11F_REV;if(Z===MY)return J.BYTE;if(Z===LY)return J.SHORT;if(Z===Z6)return J.UNSIGNED_SHORT;if(Z===BZ)return J.INT;if(Z===W8)return J.UNSIGNED_INT;if(Z===g9)return J.FLOAT;if(Z===p9)return J.HALF_FLOAT;if(Z===zY)return J.ALPHA;if(Z===IY)return J.RGB;if(Z===C9)return J.RGBA;if(Z===j8)return J.DEPTH_COMPONENT;if(Z===y8)return J.DEPTH_STENCIL;if(Z===CY)return J.RED;if(Z===CZ)return J.RED_INTEGER;if(Z===I7)return J.RG;if(Z===wZ)return J.RG_INTEGER;if(Z===AZ)return J.RGBA_INTEGER;if(Z===BQ||Z===zQ||Z===IQ||Z===CQ)if(H===EJ)if(K=Q.get("WEBGL_compressed_texture_s3tc_srgb"),K!==null){if(Z===BQ)return K.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(Z===zQ)return K.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(Z===IQ)return K.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(Z===CQ)return K.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(K=Q.get("WEBGL_compressed_texture_s3tc"),K!==null){if(Z===BQ)return K.COMPRESSED_RGB_S3TC_DXT1_EXT;if(Z===zQ)return K.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(Z===IQ)return K.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(Z===CQ)return K.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(Z===_Z||Z===PZ||Z===TZ||Z===SZ)if(K=Q.get("WEBGL_compressed_texture_pvrtc"),K!==null){if(Z===_Z)return K.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(Z===PZ)return K.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(Z===TZ)return K.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(Z===SZ)return K.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(Z===jZ||Z===yZ||Z===fZ||Z===bZ||Z===vZ||Z===hZ||Z===xZ)if(K=Q.get("WEBGL_compressed_texture_etc"),K!==null){if(Z===jZ||Z===yZ)return H===EJ?K.COMPRESSED_SRGB8_ETC2:K.COMPRESSED_RGB8_ETC2;if(Z===fZ)return H===EJ?K.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:K.COMPRESSED_RGBA8_ETC2_EAC;if(Z===bZ)return K.COMPRESSED_R11_EAC;if(Z===vZ)return K.COMPRESSED_SIGNED_R11_EAC;if(Z===hZ)return K.COMPRESSED_RG11_EAC;if(Z===xZ)return K.COMPRESSED_SIGNED_RG11_EAC}else return null;if(Z===gZ||Z===pZ||Z===mZ||Z===dZ||Z===lZ||Z===uZ||Z===cZ||Z===nZ||Z===sZ||Z===iZ||Z===oZ||Z===aZ||Z===rZ||Z===tZ)if(K=Q.get("WEBGL_compressed_texture_astc"),K!==null){if(Z===gZ)return H===EJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:K.COMPRESSED_RGBA_ASTC_4x4_KHR;if(Z===pZ)return H===EJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:K.COMPRESSED_RGBA_ASTC_5x4_KHR;if(Z===mZ)return H===EJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:K.COMPRESSED_RGBA_ASTC_5x5_KHR;if(Z===dZ)return H===EJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:K.COMPRESSED_RGBA_ASTC_6x5_KHR;if(Z===lZ)return H===EJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:K.COMPRESSED_RGBA_ASTC_6x6_KHR;if(Z===uZ)return H===EJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:K.COMPRESSED_RGBA_ASTC_8x5_KHR;if(Z===cZ)return H===EJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:K.COMPRESSED_RGBA_ASTC_8x6_KHR;if(Z===nZ)return H===EJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:K.COMPRESSED_RGBA_ASTC_8x8_KHR;if(Z===sZ)return H===EJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:K.COMPRESSED_RGBA_ASTC_10x5_KHR;if(Z===iZ)return H===EJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:K.COMPRESSED_RGBA_ASTC_10x6_KHR;if(Z===oZ)return H===EJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:K.COMPRESSED_RGBA_ASTC_10x8_KHR;if(Z===aZ)return H===EJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:K.COMPRESSED_RGBA_ASTC_10x10_KHR;if(Z===rZ)return H===EJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:K.COMPRESSED_RGBA_ASTC_12x10_KHR;if(Z===tZ)return H===EJ?K.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:K.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(Z===eZ||Z===JW||Z===QW)if(K=Q.get("EXT_texture_compression_bptc"),K!==null){if(Z===eZ)return H===EJ?K.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:K.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(Z===JW)return K.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(Z===QW)return K.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(Z===$W||Z===ZW||Z===WW||Z===KW)if(K=Q.get("EXT_texture_compression_rgtc"),K!==null){if(Z===$W)return K.COMPRESSED_RED_RGTC1_EXT;if(Z===ZW)return K.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(Z===WW)return K.COMPRESSED_RED_GREEN_RGTC2_EXT;if(Z===KW)return K.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;if(Z===z7)return J.UNSIGNED_INT_24_8;return J[Z]!==void 0?J[Z]:null}return{convert:$}}var T1=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,S1=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class fU{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(J,Q){if(this.texture===null){let $=new xQ(J.texture);if(J.depthNear!==Q.depthNear||J.depthFar!==Q.depthFar)this.depthNear=J.depthNear,this.depthFar=J.depthFar;this.texture=$}}getMesh(J){if(this.texture!==null){if(this.mesh===null){let Q=J.cameras[0].viewport,$=new Q9({vertexShader:T1,fragmentShader:S1,uniforms:{depthColor:{value:this.texture},depthWidth:{value:Q.z},depthHeight:{value:Q.w}}});this.mesh=new VJ(new w7(20,20),$)}}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class bU extends F9{constructor(J,Q){super();let $=this,Z=null,W=1,K=null,H="local-floor",Y=1,X=null,U=null,N=null,q=null,G=null,E=null,O=typeof XRWebGLBinding<"u",R=new fU,D={},F=Q.getContextAttributes(),M=null,L=null,B=[],P=[],C=new s,w=null,k=new PJ;k.viewport=new qJ;let A=new PJ;A.viewport=new qJ;let h=[k,A],S=new JK,v=null,l=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(i){let G0=B[i];if(G0===void 0)G0=new X6,B[i]=G0;return G0.getTargetRaySpace()},this.getControllerGrip=function(i){let G0=B[i];if(G0===void 0)G0=new X6,B[i]=G0;return G0.getGripSpace()},this.getHand=function(i){let G0=B[i];if(G0===void 0)G0=new X6,B[i]=G0;return G0.getHandSpace()};function f(i){let G0=P.indexOf(i.inputSource);if(G0===-1)return;let V0=B[G0];if(V0!==void 0)V0.update(i.inputSource,i.frame,X||K),V0.dispatchEvent({type:i.type,data:i.inputSource})}function c(){Z.removeEventListener("select",f),Z.removeEventListener("selectstart",f),Z.removeEventListener("selectend",f),Z.removeEventListener("squeeze",f),Z.removeEventListener("squeezestart",f),Z.removeEventListener("squeezeend",f),Z.removeEventListener("end",c),Z.removeEventListener("inputsourceschange",x);for(let i=0;i<B.length;i++){let G0=P[i];if(G0===null)continue;P[i]=null,B[i].disconnect(G0)}v=null,l=null,R.reset();for(let i in D)delete D[i];J.setRenderTarget(M),G=null,q=null,N=null,Z=null,L=null,WJ.stop(),$.isPresenting=!1,J.setPixelRatio(w),J.setSize(C.width,C.height,!1),$.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(i){if(W=i,$.isPresenting===!0)q0("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(i){if(H=i,$.isPresenting===!0)q0("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return X||K},this.setReferenceSpace=function(i){X=i},this.getBaseLayer=function(){return q!==null?q:G},this.getBinding=function(){if(N===null&&O)N=new XRWebGLBinding(Z,Q);return N},this.getFrame=function(){return E},this.getSession=function(){return Z},this.setSession=async function(i){if(Z=i,Z!==null){if(M=J.getRenderTarget(),Z.addEventListener("select",f),Z.addEventListener("selectstart",f),Z.addEventListener("selectend",f),Z.addEventListener("squeeze",f),Z.addEventListener("squeezestart",f),Z.addEventListener("squeezeend",f),Z.addEventListener("end",c),Z.addEventListener("inputsourceschange",x),F.xrCompatible!==!0)await Q.makeXRCompatible();if(w=J.getPixelRatio(),J.getSize(C),!(O&&("createProjectionLayer"in XRWebGLBinding.prototype))){let V0={antialias:F.antialias,alpha:!0,depth:F.depth,stencil:F.stencil,framebufferScaleFactor:W};G=new XRWebGLLayer(Z,Q,V0),Z.updateRenderState({baseLayer:G}),J.setPixelRatio(1),J.setSize(G.framebufferWidth,G.framebufferHeight,!1),L=new iJ(G.framebufferWidth,G.framebufferHeight,{format:C9,type:E9,colorSpace:J.outputColorSpace,stencilBuffer:F.stencil,resolveDepthBuffer:G.ignoreDepthValues===!1,resolveStencilBuffer:G.ignoreDepthValues===!1})}else{let V0=null,E0=null,b0=null;if(F.depth)b0=F.stencil?Q.DEPTH24_STENCIL8:Q.DEPTH_COMPONENT24,V0=F.stencil?y8:j8,E0=F.stencil?z7:W8;let e0={colorFormat:Q.RGBA8,depthFormat:b0,scaleFactor:W};N=this.getBinding(),q=N.createProjectionLayer(e0),Z.updateRenderState({layers:[q]}),J.setPixelRatio(1),J.setSize(q.textureWidth,q.textureHeight,!1),L=new iJ(q.textureWidth,q.textureHeight,{format:C9,type:E9,depthTexture:new v8(q.textureWidth,q.textureHeight,E0,void 0,void 0,void 0,void 0,void 0,void 0,V0),stencilBuffer:F.stencil,colorSpace:J.outputColorSpace,samples:F.antialias?4:0,resolveDepthBuffer:q.ignoreDepthValues===!1,resolveStencilBuffer:q.ignoreDepthValues===!1})}L.isXRRenderTarget=!0,this.setFoveation(Y),X=null,K=await Z.requestReferenceSpace(H),WJ.setContext(Z),WJ.start(),$.isPresenting=!0,$.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(Z!==null)return Z.environmentBlendMode},this.getDepthTexture=function(){return R.getDepthTexture()};function x(i){for(let G0=0;G0<i.removed.length;G0++){let V0=i.removed[G0],E0=P.indexOf(V0);if(E0>=0)P[E0]=null,B[E0].disconnect(V0)}for(let G0=0;G0<i.added.length;G0++){let V0=i.added[G0],E0=P.indexOf(V0);if(E0===-1){for(let e0=0;e0<B.length;e0++)if(e0>=P.length){P.push(V0),E0=e0;break}else if(P[e0]===null){P[e0]=V0,E0=e0;break}if(E0===-1)break}let b0=B[E0];if(b0)b0.connect(V0)}}let m=new _,Q0=new _;function $0(i,G0,V0){m.setFromMatrixPosition(G0.matrixWorld),Q0.setFromMatrixPosition(V0.matrixWorld);let E0=m.distanceTo(Q0),b0=G0.projectionMatrix.elements,e0=V0.projectionMatrix.elements,c0=b0[14]/(b0[10]-1),s0=b0[14]/(b0[10]+1),r=(b0[9]+1)/b0[5],Z0=(b0[9]-1)/b0[5],e=(b0[8]-1)/b0[0],O0=(e0[8]+1)/e0[0],T=c0*e,h0=c0*O0,N0=E0/(-e+O0),x0=N0*-e;if(G0.matrixWorld.decompose(i.position,i.quaternion,i.scale),i.translateX(x0),i.translateZ(N0),i.matrixWorld.compose(i.position,i.quaternion,i.scale),i.matrixWorldInverse.copy(i.matrixWorld).invert(),b0[10]===-1)i.projectionMatrix.copy(G0.projectionMatrix),i.projectionMatrixInverse.copy(G0.projectionMatrixInverse);else{let H0=c0+N0,d0=s0+N0,I=T-x0,V=h0+(E0-x0),b=r*s0/d0*H0,n=Z0*s0/d0*H0;i.projectionMatrix.makePerspective(I,V,b,n,H0,d0),i.projectionMatrixInverse.copy(i.projectionMatrix).invert()}}function U0(i,G0){if(G0===null)i.matrixWorld.copy(i.matrix);else i.matrixWorld.multiplyMatrices(G0.matrixWorld,i.matrix);i.matrixWorldInverse.copy(i.matrixWorld).invert()}this.updateCamera=function(i){if(Z===null)return;let{near:G0,far:V0}=i;if(R.texture!==null){if(R.depthNear>0)G0=R.depthNear;if(R.depthFar>0)V0=R.depthFar}if(S.near=A.near=k.near=G0,S.far=A.far=k.far=V0,v!==S.near||l!==S.far)Z.updateRenderState({depthNear:S.near,depthFar:S.far}),v=S.near,l=S.far;S.layers.mask=i.layers.mask|6,k.layers.mask=S.layers.mask&-5,A.layers.mask=S.layers.mask&-3;let E0=i.parent,b0=S.cameras;U0(S,E0);for(let e0=0;e0<b0.length;e0++)U0(b0[e0],E0);if(b0.length===2)$0(S,k,A);else S.projectionMatrix.copy(k.projectionMatrix);_0(i,S,E0)};function _0(i,G0,V0){if(V0===null)i.matrix.copy(G0.matrixWorld);else i.matrix.copy(V0.matrixWorld),i.matrix.invert(),i.matrix.multiply(G0.matrixWorld);if(i.matrix.decompose(i.position,i.quaternion,i.scale),i.updateMatrixWorld(!0),i.projectionMatrix.copy(G0.projectionMatrix),i.projectionMatrixInverse.copy(G0.projectionMatrixInverse),i.isPerspectiveCamera)i.fov=w8*2*Math.atan(1/i.projectionMatrix.elements[5]),i.zoom=1}this.getCamera=function(){return S},this.getFoveation=function(){if(q===null&&G===null)return;return Y},this.setFoveation=function(i){if(Y=i,q!==null)q.fixedFoveation=i;if(G!==null&&G.fixedFoveation!==void 0)G.fixedFoveation=i},this.hasDepthSensing=function(){return R.texture!==null},this.getDepthSensingMesh=function(){return R.getMesh(S)},this.getCameraTexture=function(i){return D[i]};let K0=null;function KJ(i,G0){if(U=G0.getViewerPose(X||K),E=G0,U!==null){let V0=U.views;if(G!==null)J.setRenderTargetFramebuffer(L,G.framebuffer),J.setRenderTarget(L);let E0=!1;if(V0.length!==S.cameras.length)S.cameras.length=0,E0=!0;for(let s0=0;s0<V0.length;s0++){let r=V0[s0],Z0=null;if(G!==null)Z0=G.getViewport(r);else{let O0=N.getViewSubImage(q,r);if(Z0=O0.viewport,s0===0)J.setRenderTargetTextures(L,O0.colorTexture,O0.depthStencilTexture),J.setRenderTarget(L)}let e=h[s0];if(e===void 0)e=new PJ,e.layers.enable(s0),e.viewport=new qJ,h[s0]=e;if(e.matrix.fromArray(r.transform.matrix),e.matrix.decompose(e.position,e.quaternion,e.scale),e.projectionMatrix.fromArray(r.projectionMatrix),e.projectionMatrixInverse.copy(e.projectionMatrix).invert(),e.viewport.set(Z0.x,Z0.y,Z0.width,Z0.height),s0===0)S.matrix.copy(e.matrix),S.matrix.decompose(S.position,S.quaternion,S.scale);if(E0===!0)S.cameras.push(e)}let b0=Z.enabledFeatures;if(b0&&b0.includes("depth-sensing")&&Z.depthUsage=="gpu-optimized"&&O){N=$.getBinding();let s0=N.getDepthInformation(V0[0]);if(s0&&s0.isValid&&s0.texture)R.init(s0,Z.renderState)}if(b0&&b0.includes("camera-access")&&O){J.state.unbindTexture(),N=$.getBinding();for(let s0=0;s0<V0.length;s0++){let r=V0[s0].camera;if(r){let Z0=D[r];if(!Z0)Z0=new xQ,D[r]=Z0;let e=N.getCameraImage(r);Z0.sourceTexture=e}}}}for(let V0=0;V0<B.length;V0++){let E0=P[V0],b0=B[V0];if(E0!==null&&b0!==void 0)b0.update(E0,G0,X||K)}if(K0)K0(i,G0);if(G0.detectedPlanes)$.dispatchEvent({type:"planesdetected",data:G0});E=null}let WJ=new IU;WJ.setAnimationLoop(KJ),this.setAnimationLoop=function(i){K0=i},this.dispose=function(){}}}var m8=new J9,j1=new m0;function y1(J,Q){function $(D,F){if(D.matrixAutoUpdate===!0)D.updateMatrix();F.value.copy(D.matrix)}function Z(D,F){if(F.color.getRGB(D.fogColor.value,SW(J)),F.isFog)D.fogNear.value=F.near,D.fogFar.value=F.far;else if(F.isFogExp2)D.fogDensity.value=F.density}function W(D,F,M,L,B){if(F.isMeshBasicMaterial)K(D,F);else if(F.isMeshLambertMaterial){if(K(D,F),F.envMap)D.envMapIntensity.value=F.envMapIntensity}else if(F.isMeshToonMaterial)K(D,F),q(D,F);else if(F.isMeshPhongMaterial){if(K(D,F),N(D,F),F.envMap)D.envMapIntensity.value=F.envMapIntensity}else if(F.isMeshStandardMaterial){if(K(D,F),G(D,F),F.isMeshPhysicalMaterial)E(D,F,B)}else if(F.isMeshMatcapMaterial)K(D,F),O(D,F);else if(F.isMeshDepthMaterial)K(D,F);else if(F.isMeshDistanceMaterial)K(D,F),R(D,F);else if(F.isMeshNormalMaterial)K(D,F);else if(F.isLineBasicMaterial){if(H(D,F),F.isLineDashedMaterial)Y(D,F)}else if(F.isPointsMaterial)X(D,F,M,L);else if(F.isSpriteMaterial)U(D,F);else if(F.isShadowMaterial)D.color.value.copy(F.color),D.opacity.value=F.opacity;else if(F.isShaderMaterial)F.uniformsNeedUpdate=!1}function K(D,F){if(D.opacity.value=F.opacity,F.color)D.diffuse.value.copy(F.color);if(F.emissive)D.emissive.value.copy(F.emissive).multiplyScalar(F.emissiveIntensity);if(F.map)D.map.value=F.map,$(F.map,D.mapTransform);if(F.alphaMap)D.alphaMap.value=F.alphaMap,$(F.alphaMap,D.alphaMapTransform);if(F.bumpMap){if(D.bumpMap.value=F.bumpMap,$(F.bumpMap,D.bumpMapTransform),D.bumpScale.value=F.bumpScale,F.side===nJ)D.bumpScale.value*=-1}if(F.normalMap){if(D.normalMap.value=F.normalMap,$(F.normalMap,D.normalMapTransform),D.normalScale.value.copy(F.normalScale),F.side===nJ)D.normalScale.value.negate()}if(F.displacementMap)D.displacementMap.value=F.displacementMap,$(F.displacementMap,D.displacementMapTransform),D.displacementScale.value=F.displacementScale,D.displacementBias.value=F.displacementBias;if(F.emissiveMap)D.emissiveMap.value=F.emissiveMap,$(F.emissiveMap,D.emissiveMapTransform);if(F.specularMap)D.specularMap.value=F.specularMap,$(F.specularMap,D.specularMapTransform);if(F.alphaTest>0)D.alphaTest.value=F.alphaTest;let M=Q.get(F),L=M.envMap,B=M.envMapRotation;if(L){if(D.envMap.value=L,m8.copy(B),m8.x*=-1,m8.y*=-1,m8.z*=-1,L.isCubeTexture&&L.isRenderTargetTexture===!1)m8.y*=-1,m8.z*=-1;D.envMapRotation.value.setFromMatrix4(j1.makeRotationFromEuler(m8)),D.flipEnvMap.value=L.isCubeTexture&&L.isRenderTargetTexture===!1?-1:1,D.reflectivity.value=F.reflectivity,D.ior.value=F.ior,D.refractionRatio.value=F.refractionRatio}if(F.lightMap)D.lightMap.value=F.lightMap,D.lightMapIntensity.value=F.lightMapIntensity,$(F.lightMap,D.lightMapTransform);if(F.aoMap)D.aoMap.value=F.aoMap,D.aoMapIntensity.value=F.aoMapIntensity,$(F.aoMap,D.aoMapTransform)}function H(D,F){if(D.diffuse.value.copy(F.color),D.opacity.value=F.opacity,F.map)D.map.value=F.map,$(F.map,D.mapTransform)}function Y(D,F){D.dashSize.value=F.dashSize,D.totalSize.value=F.dashSize+F.gapSize,D.scale.value=F.scale}function X(D,F,M,L){if(D.diffuse.value.copy(F.color),D.opacity.value=F.opacity,D.size.value=F.size*M,D.scale.value=L*0.5,F.map)D.map.value=F.map,$(F.map,D.uvTransform);if(F.alphaMap)D.alphaMap.value=F.alphaMap,$(F.alphaMap,D.alphaMapTransform);if(F.alphaTest>0)D.alphaTest.value=F.alphaTest}function U(D,F){if(D.diffuse.value.copy(F.color),D.opacity.value=F.opacity,D.rotation.value=F.rotation,F.map)D.map.value=F.map,$(F.map,D.mapTransform);if(F.alphaMap)D.alphaMap.value=F.alphaMap,$(F.alphaMap,D.alphaMapTransform);if(F.alphaTest>0)D.alphaTest.value=F.alphaTest}function N(D,F){D.specular.value.copy(F.specular),D.shininess.value=Math.max(F.shininess,0.0001)}function q(D,F){if(F.gradientMap)D.gradientMap.value=F.gradientMap}function G(D,F){if(D.metalness.value=F.metalness,F.metalnessMap)D.metalnessMap.value=F.metalnessMap,$(F.metalnessMap,D.metalnessMapTransform);if(D.roughness.value=F.roughness,F.roughnessMap)D.roughnessMap.value=F.roughnessMap,$(F.roughnessMap,D.roughnessMapTransform);if(F.envMap)D.envMapIntensity.value=F.envMapIntensity}function E(D,F,M){if(D.ior.value=F.ior,F.sheen>0){if(D.sheenColor.value.copy(F.sheenColor).multiplyScalar(F.sheen),D.sheenRoughness.value=F.sheenRoughness,F.sheenColorMap)D.sheenColorMap.value=F.sheenColorMap,$(F.sheenColorMap,D.sheenColorMapTransform);if(F.sheenRoughnessMap)D.sheenRoughnessMap.value=F.sheenRoughnessMap,$(F.sheenRoughnessMap,D.sheenRoughnessMapTransform)}if(F.clearcoat>0){if(D.clearcoat.value=F.clearcoat,D.clearcoatRoughness.value=F.clearcoatRoughness,F.clearcoatMap)D.clearcoatMap.value=F.clearcoatMap,$(F.clearcoatMap,D.clearcoatMapTransform);if(F.clearcoatRoughnessMap)D.clearcoatRoughnessMap.value=F.clearcoatRoughnessMap,$(F.clearcoatRoughnessMap,D.clearcoatRoughnessMapTransform);if(F.clearcoatNormalMap){if(D.clearcoatNormalMap.value=F.clearcoatNormalMap,$(F.clearcoatNormalMap,D.clearcoatNormalMapTransform),D.clearcoatNormalScale.value.copy(F.clearcoatNormalScale),F.side===nJ)D.clearcoatNormalScale.value.negate()}}if(F.dispersion>0)D.dispersion.value=F.dispersion;if(F.iridescence>0){if(D.iridescence.value=F.iridescence,D.iridescenceIOR.value=F.iridescenceIOR,D.iridescenceThicknessMinimum.value=F.iridescenceThicknessRange[0],D.iridescenceThicknessMaximum.value=F.iridescenceThicknessRange[1],F.iridescenceMap)D.iridescenceMap.value=F.iridescenceMap,$(F.iridescenceMap,D.iridescenceMapTransform);if(F.iridescenceThicknessMap)D.iridescenceThicknessMap.value=F.iridescenceThicknessMap,$(F.iridescenceThicknessMap,D.iridescenceThicknessMapTransform)}if(F.transmission>0){if(D.transmission.value=F.transmission,D.transmissionSamplerMap.value=M.texture,D.transmissionSamplerSize.value.set(M.width,M.height),F.transmissionMap)D.transmissionMap.value=F.transmissionMap,$(F.transmissionMap,D.transmissionMapTransform);if(D.thickness.value=F.thickness,F.thicknessMap)D.thicknessMap.value=F.thicknessMap,$(F.thicknessMap,D.thicknessMapTransform);D.attenuationDistance.value=F.attenuationDistance,D.attenuationColor.value.copy(F.attenuationColor)}if(F.anisotropy>0){if(D.anisotropyVector.value.set(F.anisotropy*Math.cos(F.anisotropyRotation),F.anisotropy*Math.sin(F.anisotropyRotation)),F.anisotropyMap)D.anisotropyMap.value=F.anisotropyMap,$(F.anisotropyMap,D.anisotropyMapTransform)}if(D.specularIntensity.value=F.specularIntensity,D.specularColor.value.copy(F.specularColor),F.specularColorMap)D.specularColorMap.value=F.specularColorMap,$(F.specularColorMap,D.specularColorMapTransform);if(F.specularIntensityMap)D.specularIntensityMap.value=F.specularIntensityMap,$(F.specularIntensityMap,D.specularIntensityMapTransform)}function O(D,F){if(F.matcap)D.matcap.value=F.matcap}function R(D,F){let M=Q.get(F).light;D.referencePosition.value.setFromMatrixPosition(M.matrixWorld),D.nearDistance.value=M.shadow.camera.near,D.farDistance.value=M.shadow.camera.far}return{refreshFogUniforms:Z,refreshMaterialUniforms:W}}function f1(J,Q,$,Z){let W={},K={},H=[],Y=J.getParameter(J.MAX_UNIFORM_BUFFER_BINDINGS);function X(M,L){let B=L.program;Z.uniformBlockBinding(M,B)}function U(M,L){let B=W[M.id];if(B===void 0)O(M),B=N(M),W[M.id]=B,M.addEventListener("dispose",D);let P=L.program;Z.updateUBOMapping(M,P);let C=Q.render.frame;if(K[M.id]!==C)G(M),K[M.id]=C}function N(M){let L=q();M.__bindingPointIndex=L;let B=J.createBuffer(),P=M.__size,C=M.usage;return J.bindBuffer(J.UNIFORM_BUFFER,B),J.bufferData(J.UNIFORM_BUFFER,P,C),J.bindBuffer(J.UNIFORM_BUFFER,null),J.bindBufferBase(J.UNIFORM_BUFFER,L,B),B}function q(){for(let M=0;M<Y;M++)if(H.indexOf(M)===-1)return H.push(M),M;return j0("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function G(M){let L=W[M.id],B=M.uniforms,P=M.__cache;J.bindBuffer(J.UNIFORM_BUFFER,L);for(let C=0,w=B.length;C<w;C++){let k=Array.isArray(B[C])?B[C]:[B[C]];for(let A=0,h=k.length;A<h;A++){let S=k[A];if(E(S,C,A,P)===!0){let v=S.__offset,l=Array.isArray(S.value)?S.value:[S.value],f=0;for(let c=0;c<l.length;c++){let x=l[c],m=R(x);if(typeof x==="number"||typeof x==="boolean")S.__data[0]=x,J.bufferSubData(J.UNIFORM_BUFFER,v+f,S.__data);else if(x.isMatrix3)S.__data[0]=x.elements[0],S.__data[1]=x.elements[1],S.__data[2]=x.elements[2],S.__data[3]=0,S.__data[4]=x.elements[3],S.__data[5]=x.elements[4],S.__data[6]=x.elements[5],S.__data[7]=0,S.__data[8]=x.elements[6],S.__data[9]=x.elements[7],S.__data[10]=x.elements[8],S.__data[11]=0;else x.toArray(S.__data,f),f+=m.storage/Float32Array.BYTES_PER_ELEMENT}J.bufferSubData(J.UNIFORM_BUFFER,v,S.__data)}}}J.bindBuffer(J.UNIFORM_BUFFER,null)}function E(M,L,B,P){let C=M.value,w=L+"_"+B;if(P[w]===void 0){if(typeof C==="number"||typeof C==="boolean")P[w]=C;else P[w]=C.clone();return!0}else{let k=P[w];if(typeof C==="number"||typeof C==="boolean"){if(k!==C)return P[w]=C,!0}else if(k.equals(C)===!1)return k.copy(C),!0}return!1}function O(M){let L=M.uniforms,B=0,P=16;for(let w=0,k=L.length;w<k;w++){let A=Array.isArray(L[w])?L[w]:[L[w]];for(let h=0,S=A.length;h<S;h++){let v=A[h],l=Array.isArray(v.value)?v.value:[v.value];for(let f=0,c=l.length;f<c;f++){let x=l[f],m=R(x),Q0=B%P,$0=Q0%m.boundary,U0=Q0+$0;if(B+=$0,U0!==0&&P-U0<m.storage)B+=P-U0;v.__data=new Float32Array(m.storage/Float32Array.BYTES_PER_ELEMENT),v.__offset=B,B+=m.storage}}}let C=B%P;if(C>0)B+=P-C;return M.__size=B,M.__cache={},this}function R(M){let L={boundary:0,storage:0};if(typeof M==="number"||typeof M==="boolean")L.boundary=4,L.storage=4;else if(M.isVector2)L.boundary=8,L.storage=8;else if(M.isVector3||M.isColor)L.boundary=16,L.storage=12;else if(M.isVector4)L.boundary=16,L.storage=16;else if(M.isMatrix3)L.boundary=48,L.storage=48;else if(M.isMatrix4)L.boundary=64,L.storage=64;else if(M.isTexture)q0("WebGLRenderer: Texture samplers can not be part of an uniforms group.");else q0("WebGLRenderer: Unsupported uniform value type.",M);return L}function D(M){let L=M.target;L.removeEventListener("dispose",D);let B=H.indexOf(L.__bindingPointIndex);H.splice(B,1),J.deleteBuffer(W[L.id]),delete W[L.id],delete K[L.id]}function F(){for(let M in W)J.deleteBuffer(W[M]);H=[],W={},K={}}return{bind:X,update:U,dispose:F}}var b1=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),w9=null;function v1(){if(w9===null)w9=new W9(b1,16,16,I7,p9),w9.name="DFG_LUT",w9.minFilter=sJ,w9.magFilter=sJ,w9.wrapS=LQ,w9.wrapT=LQ,w9.generateMipmaps=!1,w9.needsUpdate=!0;return w9}class h1{constructor(J={}){let{canvas:Q=vY(),context:$=null,depth:Z=!0,stencil:W=!1,alpha:K=!1,antialias:H=!1,premultipliedAlpha:Y=!0,preserveDrawingBuffer:X=!1,powerPreference:U="default",failIfMajorPerformanceCaveat:N=!1,reversedDepthBuffer:q=!1,outputBufferType:G=E9}=J;this.isWebGLRenderer=!0;let E;if($!==null){if(typeof WebGLRenderingContext<"u"&&$ instanceof WebGLRenderingContext)throw Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");E=$.getContextAttributes().alpha}else E=K;let O=G,R=new Set([AZ,wZ,CZ]),D=new Set([E9,W8,Z6,z7,zZ,IZ]),F=new Uint32Array(4),M=new Int32Array(4),L=null,B=null,P=[],C=[],w=null;this.domElement=Q,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=q9,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let k=this,A=!1;this._outputColorSpace=_Y;let h=0,S=0,v=null,l=-1,f=null,c=new qJ,x=new qJ,m=null,Q0=new M0(0),$0=0,U0=Q.width,_0=Q.height,K0=1,KJ=null,WJ=null,i=new qJ(0,0,U0,_0),G0=new qJ(0,0,U0,_0),V0=!1,E0=new b8,b0=!1,e0=!1,c0=new m0,s0=new _,r=new qJ,Z0={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},e=!1;function O0(){return v===null?K0:1}let T=$;function h0(z,y){return Q.getContext(z,y)}try{let z={alpha:!0,depth:Z,stencil:W,antialias:H,premultipliedAlpha:Y,preserveDrawingBuffer:X,powerPreference:U,failIfMajorPerformanceCaveat:N};if("setAttribute"in Q)Q.setAttribute("data-engine",`three.js r${vH}`);if(Q.addEventListener("webglcontextlost",a,!1),Q.addEventListener("webglcontextrestored",A0,!1),Q.addEventListener("webglcontextcreationerror",l0,!1),T===null){if(T=h0("webgl2",z),T===null)if(h0("webgl2"))throw Error("Error creating WebGL context with your selected attributes.");else throw Error("Error creating WebGL context.")}}catch(z){throw j0("WebGLRenderer: "+z.message),z}let N0,x0,H0,d0,I,V,b,n,t,u,z0,F0,S0,v0,J0,W0,w0,g0,L0,r0,j,Y0,X0;function C0(){if(N0=new uF(T),N0.init(),j=new P1(T,N0),x0=new vF(T,N0,J,j),H0=new A1(T,N0),x0.reversedDepthBuffer&&q)H0.buffers.depth.setReversed(!0);d0=new sF(T),I=new E1,V=new _1(T,N0,H0,I,x0,j,d0),b=new lF(k),n=new tN(T),Y0=new fF(T,n),t=new cF(T,n,d0,Y0),u=new oF(T,t,n,Y0,d0),g0=new iF(T,x0,V),J0=new hF(I),z0=new q1(k,b,N0,x0,Y0,J0),F0=new y1(k,I),S0=new D1,v0=new V1(N0),w0=new yF(k,b,H0,u,E,Y),W0=new w1(k,u,x0),X0=new f1(T,d0,x0,H0),L0=new bF(T,N0,d0),r0=new nF(T,N0,d0),d0.programs=z0.programs,k.capabilities=x0,k.extensions=N0,k.properties=I,k.renderLists=S0,k.shadowMap=W0,k.state=H0,k.info=d0}if(C0(),O!==E9)w=new rF(O,Q.width,Q.height,Z,W);let o=new bU(k,T);this.xr=o,this.getContext=function(){return T},this.getContextAttributes=function(){return T.getContextAttributes()},this.forceContextLoss=function(){let z=N0.get("WEBGL_lose_context");if(z)z.loseContext()},this.forceContextRestore=function(){let z=N0.get("WEBGL_lose_context");if(z)z.restoreContext()},this.getPixelRatio=function(){return K0},this.setPixelRatio=function(z){if(z===void 0)return;K0=z,this.setSize(U0,_0,!1)},this.getSize=function(z){return z.set(U0,_0)},this.setSize=function(z,y,d=!0){if(o.isPresenting){q0("WebGLRenderer: Can't change size while VR device is presenting.");return}if(U0=z,_0=y,Q.width=Math.floor(z*K0),Q.height=Math.floor(y*K0),d===!0)Q.style.width=z+"px",Q.style.height=y+"px";if(w!==null)w.setSize(Q.width,Q.height);this.setViewport(0,0,z,y)},this.getDrawingBufferSize=function(z){return z.set(U0*K0,_0*K0).floor()},this.setDrawingBufferSize=function(z,y,d){U0=z,_0=y,K0=d,Q.width=Math.floor(z*d),Q.height=Math.floor(y*d),this.setViewport(0,0,z,y)},this.setEffects=function(z){if(O===E9){console.error("THREE.WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(z){for(let y=0;y<z.length;y++)if(z[y].isOutputPass===!0){console.warn("THREE.WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}w.setEffects(z||[])},this.getCurrentViewport=function(z){return z.copy(c)},this.getViewport=function(z){return z.copy(i)},this.setViewport=function(z,y,d,p){if(z.isVector4)i.set(z.x,z.y,z.z,z.w);else i.set(z,y,d,p);H0.viewport(c.copy(i).multiplyScalar(K0).round())},this.getScissor=function(z){return z.copy(G0)},this.setScissor=function(z,y,d,p){if(z.isVector4)G0.set(z.x,z.y,z.z,z.w);else G0.set(z,y,d,p);H0.scissor(x.copy(G0).multiplyScalar(K0).round())},this.getScissorTest=function(){return V0},this.setScissorTest=function(z){H0.setScissorTest(V0=z)},this.setOpaqueSort=function(z){KJ=z},this.setTransparentSort=function(z){WJ=z},this.getClearColor=function(z){return z.copy(w0.getClearColor())},this.setClearColor=function(){w0.setClearColor(...arguments)},this.getClearAlpha=function(){return w0.getClearAlpha()},this.setClearAlpha=function(){w0.setClearAlpha(...arguments)},this.clear=function(z=!0,y=!0,d=!0){let p=0;if(z){let g=!1;if(v!==null){let R0=v.texture.format;g=R.has(R0)}if(g){let R0=v.texture.type,I0=D.has(R0),k0=w0.getClearColor(),P0=w0.getClearAlpha(),y0=k0.r,i0=k0.g,t0=k0.b;if(I0)F[0]=y0,F[1]=i0,F[2]=t0,F[3]=P0,T.clearBufferuiv(T.COLOR,0,F);else M[0]=y0,M[1]=i0,M[2]=t0,M[3]=P0,T.clearBufferiv(T.COLOR,0,M)}else p|=T.COLOR_BUFFER_BIT}if(y)p|=T.DEPTH_BUFFER_BIT;if(d)p|=T.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295);if(p!==0)T.clear(p)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){Q.removeEventListener("webglcontextlost",a,!1),Q.removeEventListener("webglcontextrestored",A0,!1),Q.removeEventListener("webglcontextcreationerror",l0,!1),w0.dispose(),S0.dispose(),v0.dispose(),I.dispose(),b.dispose(),u.dispose(),Y0.dispose(),X0.dispose(),z0.dispose(),o.dispose(),o.removeEventListener("sessionstart",VK),o.removeEventListener("sessionend",BK),U8.stop()};function a(z){z.preventDefault(),s7("WebGLRenderer: Context Lost."),A=!0}function A0(){s7("WebGLRenderer: Context Restored."),A=!1;let z=d0.autoReset,y=W0.enabled,d=W0.autoUpdate,p=W0.needsUpdate,g=W0.type;C0(),d0.autoReset=z,W0.enabled=y,W0.autoUpdate=d,W0.needsUpdate=p,W0.type=g}function l0(z){j0("WebGLRenderer: A WebGL context could not be created. Reason: ",z.statusMessage)}function FJ(z){let y=z.target;y.removeEventListener("dispose",FJ),YJ(y)}function YJ(z){_9(z),I.remove(z)}function _9(z){let y=I.get(z).programs;if(y!==void 0){if(y.forEach(function(d){z0.releaseProgram(d)}),z.isShaderMaterial)z0.releaseShaderCache(z)}}this.renderBufferDirect=function(z,y,d,p,g,R0){if(y===null)y=Z0;let I0=g.isMesh&&g.matrixWorld.determinant()<0,k0=mU(z,y,d,p,g);H0.setMaterial(p,I0);let P0=d.index,y0=1;if(p.wireframe===!0){if(P0=t.getWireframeAttribute(d),P0===void 0)return;y0=2}let i0=d.drawRange,t0=d.attributes.position,f0=i0.start*y0,XJ=(i0.start+i0.count)*y0;if(R0!==null)f0=Math.max(f0,R0.start*y0),XJ=Math.min(XJ,(R0.start+R0.count)*y0);if(P0!==null)f0=Math.max(f0,0),XJ=Math.min(XJ,P0.count);else if(t0!==void 0&&t0!==null)f0=Math.max(f0,0),XJ=Math.min(XJ,t0.count);let MJ=XJ-f0;if(MJ<0||MJ===1/0)return;Y0.setup(g,p,k0,d,P0);let OJ,UJ=L0;if(P0!==null)OJ=n.get(P0),UJ=r0,UJ.setIndex(OJ);if(g.isMesh)if(p.wireframe===!0)H0.setLineWidth(p.wireframeLinewidth*O0()),UJ.setMode(T.LINES);else UJ.setMode(T.TRIANGLES);else if(g.isLine){let fJ=p.linewidth;if(fJ===void 0)fJ=1;if(H0.setLineWidth(fJ*O0()),g.isLineSegments)UJ.setMode(T.LINES);else if(g.isLineLoop)UJ.setMode(T.LINE_LOOP);else UJ.setMode(T.LINE_STRIP)}else if(g.isPoints)UJ.setMode(T.POINTS);else if(g.isSprite)UJ.setMode(T.TRIANGLES);if(g.isBatchedMesh)if(g._multiDrawInstances!==null)i7("WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),UJ.renderMultiDrawInstances(g._multiDrawStarts,g._multiDrawCounts,g._multiDrawCount,g._multiDrawInstances);else if(!N0.get("WEBGL_multi_draw")){let{_multiDrawStarts:fJ,_multiDrawCounts:T0,_multiDrawCount:aJ}=g,ZJ=P0?n.get(P0).bytesPerElement:1,H9=I.get(p).currentProgram.getUniforms();for(let R9=0;R9<aJ;R9++)H9.setValue(T,"_gl_DrawID",R9),UJ.render(fJ[R9]/ZJ,T0[R9])}else UJ.renderMultiDraw(g._multiDrawStarts,g._multiDrawCounts,g._multiDrawCount);else if(g.isInstancedMesh)UJ.renderInstances(f0,MJ,g.count);else if(d.isInstancedBufferGeometry){let fJ=d._maxInstanceCount!==void 0?d._maxInstanceCount:1/0,T0=Math.min(d.instanceCount,fJ);UJ.renderInstances(f0,MJ,T0)}else UJ.render(f0,MJ)};function O9(z,y,d){if(z.transparent===!0&&z.side===z9&&z.forceSinglePass===!1)z.side=nJ,z.needsUpdate=!0,z6(z,y,d),z.side=L7,z.needsUpdate=!0,z6(z,y,d),z.side=z9;else z6(z,y,d)}this.compile=function(z,y,d=null){if(d===null)d=z;if(B=v0.get(d),B.init(y),C.push(B),d.traverseVisible(function(g){if(g.isLight&&g.layers.test(y.layers)){if(B.pushLight(g),g.castShadow)B.pushShadow(g)}}),z!==d)z.traverseVisible(function(g){if(g.isLight&&g.layers.test(y.layers)){if(B.pushLight(g),g.castShadow)B.pushShadow(g)}});B.setupLights();let p=new Set;return z.traverse(function(g){if(!(g.isMesh||g.isPoints||g.isLine||g.isSprite))return;let R0=g.material;if(R0)if(Array.isArray(R0))for(let I0=0;I0<R0.length;I0++){let k0=R0[I0];O9(k0,d,g),p.add(k0)}else O9(R0,d,g),p.add(R0)}),B=C.pop(),p},this.compileAsync=function(z,y,d=null){let p=this.compile(z,y,d);return new Promise((g)=>{function R0(){if(p.forEach(function(I0){if(I.get(I0).currentProgram.isReady())p.delete(I0)}),p.size===0){g(z);return}setTimeout(R0,10)}if(N0.get("KHR_parallel_shader_compile")!==null)R0();else setTimeout(R0,10)})};let L$=null;function pU(z){if(L$)L$(z)}function VK(){U8.stop()}function BK(){U8.start()}let U8=new IU;if(U8.setAnimationLoop(pU),typeof self<"u")U8.setContext(self);this.setAnimationLoop=function(z){L$=z,o.setAnimationLoop(z),z===null?U8.stop():U8.start()},o.addEventListener("sessionstart",VK),o.addEventListener("sessionend",BK),this.render=function(z,y){if(y!==void 0&&y.isCamera!==!0){j0("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(A===!0)return;let d=o.enabled===!0&&o.isPresenting===!0,p=w!==null&&(v===null||d)&&w.begin(k,v);if(z.matrixWorldAutoUpdate===!0)z.updateMatrixWorld();if(y.parent===null&&y.matrixWorldAutoUpdate===!0)y.updateMatrixWorld();if(o.enabled===!0&&o.isPresenting===!0&&(w===null||w.isCompositing()===!1)){if(o.cameraAutoUpdate===!0)o.updateCamera(y);y=o.getCamera()}if(z.isScene===!0)z.onBeforeRender(k,z,y,v);if(B=v0.get(z,C.length),B.init(y),C.push(B),c0.multiplyMatrices(y.projectionMatrix,y.matrixWorldInverse),E0.setFromProjectionMatrix(c0,XW,y.reversedDepth),e0=this.localClippingEnabled,b0=J0.init(this.clippingPlanes,e0),L=S0.get(z,P.length),L.init(),P.push(L),o.enabled===!0&&o.isPresenting===!0){let I0=k.xr.getDepthSensingMesh();if(I0!==null)V$(I0,y,-1/0,k.sortObjects)}if(V$(z,y,0,k.sortObjects),L.finish(),k.sortObjects===!0)L.sort(KJ,WJ);if(e=o.enabled===!1||o.isPresenting===!1||o.hasDepthSensing()===!1,e)w0.addToRenderList(L,z);if(this.info.render.frame++,b0===!0)J0.beginShadows();let g=B.state.shadowsArray;if(W0.render(g,z,y),b0===!0)J0.endShadows();if(this.info.autoReset===!0)this.info.reset();if((p&&w.hasRenderPass())===!1){let{opaque:I0,transmissive:k0}=L;if(B.setupLights(),y.isArrayCamera){let P0=y.cameras;if(k0.length>0)for(let y0=0,i0=P0.length;y0<i0;y0++){let t0=P0[y0];IK(I0,k0,z,t0)}if(e)w0.render(z);for(let y0=0,i0=P0.length;y0<i0;y0++){let t0=P0[y0];zK(L,z,t0,t0.viewport)}}else{if(k0.length>0)IK(I0,k0,z,y);if(e)w0.render(z);zK(L,z,y)}}if(v!==null&&S===0)V.updateMultisampleRenderTarget(v),V.updateRenderTargetMipmap(v);if(p)w.end(k);if(z.isScene===!0)z.onAfterRender(k,z,y);if(Y0.resetDefaultState(),l=-1,f=null,C.pop(),C.length>0){if(B=C[C.length-1],b0===!0)J0.setGlobalState(k.clippingPlanes,B.state.camera)}else B=null;if(P.pop(),P.length>0)L=P[P.length-1];else L=null};function V$(z,y,d,p){if(z.visible===!1)return;if(z.layers.test(y.layers)){if(z.isGroup)d=z.renderOrder;else if(z.isLOD){if(z.autoUpdate===!0)z.update(y)}else if(z.isLight){if(B.pushLight(z),z.castShadow)B.pushShadow(z)}else if(z.isSprite){if(!z.frustumCulled||E0.intersectsSprite(z)){if(p)r.setFromMatrixPosition(z.matrixWorld).applyMatrix4(c0);let I0=u.update(z),k0=z.material;if(k0.visible)L.push(z,I0,k0,d,r.z,null)}}else if(z.isMesh||z.isLine||z.isPoints){if(!z.frustumCulled||E0.intersectsObject(z)){let I0=u.update(z),k0=z.material;if(p){if(z.boundingSphere!==void 0){if(z.boundingSphere===null)z.computeBoundingSphere();r.copy(z.boundingSphere.center)}else{if(I0.boundingSphere===null)I0.computeBoundingSphere();r.copy(I0.boundingSphere.center)}r.applyMatrix4(z.matrixWorld).applyMatrix4(c0)}if(Array.isArray(k0)){let P0=I0.groups;for(let y0=0,i0=P0.length;y0<i0;y0++){let t0=P0[y0],f0=k0[t0.materialIndex];if(f0&&f0.visible)L.push(z,I0,f0,d,r.z,t0)}}else if(k0.visible)L.push(z,I0,k0,d,r.z,null)}}}let R0=z.children;for(let I0=0,k0=R0.length;I0<k0;I0++)V$(R0[I0],y,d,p)}function zK(z,y,d,p){let{opaque:g,transmissive:R0,transparent:I0}=z;if(B.setupLightsView(d),b0===!0)J0.setGlobalState(k.clippingPlanes,d);if(p)H0.viewport(c.copy(p));if(g.length>0)B6(g,y,d);if(R0.length>0)B6(R0,y,d);if(I0.length>0)B6(I0,y,d);H0.buffers.depth.setTest(!0),H0.buffers.depth.setMask(!0),H0.buffers.color.setMask(!0),H0.setPolygonOffset(!1)}function IK(z,y,d,p){if((d.isScene===!0?d.overrideMaterial:null)!==null)return;if(B.state.transmissionRenderTarget[p.id]===void 0){let f0=N0.has("EXT_color_buffer_half_float")||N0.has("EXT_color_buffer_float");B.state.transmissionRenderTarget[p.id]=new iJ(1,1,{generateMipmaps:!0,type:f0?p9:E9,minFilter:S8,samples:x0.samples,stencilBuffer:W,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:JJ.workingColorSpace})}let R0=B.state.transmissionRenderTarget[p.id],I0=p.viewport||c;R0.setSize(I0.z*k.transmissionResolutionScale,I0.w*k.transmissionResolutionScale);let k0=k.getRenderTarget(),P0=k.getActiveCubeFace(),y0=k.getActiveMipmapLevel();if(k.setRenderTarget(R0),k.getClearColor(Q0),$0=k.getClearAlpha(),$0<1)k.setClearColor(16777215,0.5);if(k.clear(),e)w0.render(d);let i0=k.toneMapping;k.toneMapping=q9;let t0=p.viewport;if(p.viewport!==void 0)p.viewport=void 0;if(B.setupLightsView(p),b0===!0)J0.setGlobalState(k.clippingPlanes,p);if(B6(z,d,p),V.updateMultisampleRenderTarget(R0),V.updateRenderTargetMipmap(R0),N0.has("WEBGL_multisampled_render_to_texture")===!1){let f0=!1;for(let XJ=0,MJ=y.length;XJ<MJ;XJ++){let OJ=y[XJ],{object:UJ,geometry:fJ,material:T0,group:aJ}=OJ;if(T0.side===z9&&UJ.layers.test(p.layers)){let ZJ=T0.side;T0.side=nJ,T0.needsUpdate=!0,CK(UJ,d,p,fJ,T0,aJ),T0.side=ZJ,T0.needsUpdate=!0,f0=!0}}if(f0===!0)V.updateMultisampleRenderTarget(R0),V.updateRenderTargetMipmap(R0)}if(k.setRenderTarget(k0,P0,y0),k.setClearColor(Q0,$0),t0!==void 0)p.viewport=t0;k.toneMapping=i0}function B6(z,y,d){let p=y.isScene===!0?y.overrideMaterial:null;for(let g=0,R0=z.length;g<R0;g++){let I0=z[g],{object:k0,geometry:P0,group:y0}=I0,i0=I0.material;if(i0.allowOverride===!0&&p!==null)i0=p;if(k0.layers.test(d.layers))CK(k0,y,d,P0,i0,y0)}}function CK(z,y,d,p,g,R0){if(z.onBeforeRender(k,y,d,p,g,R0),z.modelViewMatrix.multiplyMatrices(d.matrixWorldInverse,z.matrixWorld),z.normalMatrix.getNormalMatrix(z.modelViewMatrix),g.onBeforeRender(k,y,d,p,z,R0),g.transparent===!0&&g.side===z9&&g.forceSinglePass===!1)g.side=nJ,g.needsUpdate=!0,k.renderBufferDirect(d,y,p,g,z,R0),g.side=L7,g.needsUpdate=!0,k.renderBufferDirect(d,y,p,g,z,R0),g.side=z9;else k.renderBufferDirect(d,y,p,g,z,R0);z.onAfterRender(k,y,d,p,g,R0)}function z6(z,y,d){if(y.isScene!==!0)y=Z0;let p=I.get(z),g=B.state.lights,R0=B.state.shadowsArray,I0=g.state.version,k0=z0.getParameters(z,g.state,R0,y,d),P0=z0.getProgramCacheKey(k0),y0=p.programs;p.environment=z.isMeshStandardMaterial||z.isMeshLambertMaterial||z.isMeshPhongMaterial?y.environment:null,p.fog=y.fog;let i0=z.isMeshStandardMaterial||z.isMeshLambertMaterial&&!z.envMap||z.isMeshPhongMaterial&&!z.envMap;if(p.envMap=b.get(z.envMap||p.environment,i0),p.envMapRotation=p.environment!==null&&z.envMap===null?y.environmentRotation:z.envMapRotation,y0===void 0)z.addEventListener("dispose",FJ),y0=new Map,p.programs=y0;let t0=y0.get(P0);if(t0!==void 0){if(p.currentProgram===t0&&p.lightsStateVersion===I0)return AK(z,k0),t0}else k0.uniforms=z0.getUniforms(z),z.onBeforeCompile(k0,k),t0=z0.acquireProgram(k0,P0),y0.set(P0,t0),p.uniforms=k0.uniforms;let f0=p.uniforms;if(!z.isShaderMaterial&&!z.isRawShaderMaterial||z.clipping===!0)f0.clippingPlanes=J0.uniform;if(AK(z,k0),p.needsLights=lU(z),p.lightsStateVersion=I0,p.needsLights)f0.ambientLightColor.value=g.state.ambient,f0.lightProbe.value=g.state.probe,f0.directionalLights.value=g.state.directional,f0.directionalLightShadows.value=g.state.directionalShadow,f0.spotLights.value=g.state.spot,f0.spotLightShadows.value=g.state.spotShadow,f0.rectAreaLights.value=g.state.rectArea,f0.ltc_1.value=g.state.rectAreaLTC1,f0.ltc_2.value=g.state.rectAreaLTC2,f0.pointLights.value=g.state.point,f0.pointLightShadows.value=g.state.pointShadow,f0.hemisphereLights.value=g.state.hemi,f0.directionalShadowMatrix.value=g.state.directionalShadowMatrix,f0.spotLightMatrix.value=g.state.spotLightMatrix,f0.spotLightMap.value=g.state.spotLightMap,f0.pointShadowMatrix.value=g.state.pointShadowMatrix;return p.currentProgram=t0,p.uniformsList=null,t0}function wK(z){if(z.uniformsList===null){let y=z.currentProgram.getUniforms();z.uniformsList=V6.seqWithValue(y.seq,z.uniforms)}return z.uniformsList}function AK(z,y){let d=I.get(z);d.outputColorSpace=y.outputColorSpace,d.batching=y.batching,d.batchingColor=y.batchingColor,d.instancing=y.instancing,d.instancingColor=y.instancingColor,d.instancingMorph=y.instancingMorph,d.skinning=y.skinning,d.morphTargets=y.morphTargets,d.morphNormals=y.morphNormals,d.morphColors=y.morphColors,d.morphTargetsCount=y.morphTargetsCount,d.numClippingPlanes=y.numClippingPlanes,d.numIntersection=y.numClipIntersection,d.vertexAlphas=y.vertexAlphas,d.vertexTangents=y.vertexTangents,d.toneMapping=y.toneMapping}function mU(z,y,d,p,g){if(y.isScene!==!0)y=Z0;V.resetTextureUnits();let R0=y.fog,I0=p.isMeshStandardMaterial||p.isMeshLambertMaterial||p.isMeshPhongMaterial?y.environment:null,k0=v===null?k.outputColorSpace:v.isXRRenderTarget===!0?v.texture.colorSpace:W6,P0=p.isMeshStandardMaterial||p.isMeshLambertMaterial&&!p.envMap||p.isMeshPhongMaterial&&!p.envMap,y0=b.get(p.envMap||I0,P0),i0=p.vertexColors===!0&&!!d.attributes.color&&d.attributes.color.itemSize===4,t0=!!d.attributes.tangent&&(!!p.normalMap||p.anisotropy>0),f0=!!d.morphAttributes.position,XJ=!!d.morphAttributes.normal,MJ=!!d.morphAttributes.color,OJ=q9;if(p.toneMapped){if(v===null||v.isXRRenderTarget===!0)OJ=k.toneMapping}let UJ=d.morphAttributes.position||d.morphAttributes.normal||d.morphAttributes.color,fJ=UJ!==void 0?UJ.length:0,T0=I.get(p),aJ=B.state.lights;if(b0===!0){if(e0===!0||z!==f){let AJ=z===f&&p.id===l;J0.setState(p,z,AJ)}}let ZJ=!1;if(p.version===T0.__version){if(T0.needsLights&&T0.lightsStateVersion!==aJ.state.version)ZJ=!0;else if(T0.outputColorSpace!==k0)ZJ=!0;else if(g.isBatchedMesh&&T0.batching===!1)ZJ=!0;else if(!g.isBatchedMesh&&T0.batching===!0)ZJ=!0;else if(g.isBatchedMesh&&T0.batchingColor===!0&&g.colorTexture===null)ZJ=!0;else if(g.isBatchedMesh&&T0.batchingColor===!1&&g.colorTexture!==null)ZJ=!0;else if(g.isInstancedMesh&&T0.instancing===!1)ZJ=!0;else if(!g.isInstancedMesh&&T0.instancing===!0)ZJ=!0;else if(g.isSkinnedMesh&&T0.skinning===!1)ZJ=!0;else if(!g.isSkinnedMesh&&T0.skinning===!0)ZJ=!0;else if(g.isInstancedMesh&&T0.instancingColor===!0&&g.instanceColor===null)ZJ=!0;else if(g.isInstancedMesh&&T0.instancingColor===!1&&g.instanceColor!==null)ZJ=!0;else if(g.isInstancedMesh&&T0.instancingMorph===!0&&g.morphTexture===null)ZJ=!0;else if(g.isInstancedMesh&&T0.instancingMorph===!1&&g.morphTexture!==null)ZJ=!0;else if(T0.envMap!==y0)ZJ=!0;else if(p.fog===!0&&T0.fog!==R0)ZJ=!0;else if(T0.numClippingPlanes!==void 0&&(T0.numClippingPlanes!==J0.numPlanes||T0.numIntersection!==J0.numIntersection))ZJ=!0;else if(T0.vertexAlphas!==i0)ZJ=!0;else if(T0.vertexTangents!==t0)ZJ=!0;else if(T0.morphTargets!==f0)ZJ=!0;else if(T0.morphNormals!==XJ)ZJ=!0;else if(T0.morphColors!==MJ)ZJ=!0;else if(T0.toneMapping!==OJ)ZJ=!0;else if(T0.morphTargetsCount!==fJ)ZJ=!0}else ZJ=!0,T0.__version=p.version;let H9=T0.currentProgram;if(ZJ===!0)H9=z6(p,y,g);let R9=!1,G8=!1,l8=!1,NJ=H9.getUniforms(),SJ=T0.uniforms;if(H0.useProgram(H9.program))R9=!0,G8=!0,l8=!0;if(p.id!==l)l=p.id,G8=!0;if(R9||f!==z){if(H0.buffers.depth.getReversed()&&z.reversedDepth!==!0)z._reversedDepth=!0,z.updateProjectionMatrix();NJ.setValue(T,"projectionMatrix",z.projectionMatrix),NJ.setValue(T,"viewMatrix",z.matrixWorldInverse);let c9=NJ.map.cameraPosition;if(c9!==void 0)c9.setValue(T,s0.setFromMatrixPosition(z.matrixWorld));if(x0.logarithmicDepthBuffer)NJ.setValue(T,"logDepthBufFC",2/(Math.log(z.far+1)/Math.LN2));if(p.isMeshPhongMaterial||p.isMeshToonMaterial||p.isMeshLambertMaterial||p.isMeshBasicMaterial||p.isMeshStandardMaterial||p.isShaderMaterial)NJ.setValue(T,"isOrthographic",z.isOrthographicCamera===!0);if(f!==z)f=z,G8=!0,l8=!0}if(T0.needsLights){if(aJ.state.directionalShadowMap.length>0)NJ.setValue(T,"directionalShadowMap",aJ.state.directionalShadowMap,V);if(aJ.state.spotShadowMap.length>0)NJ.setValue(T,"spotShadowMap",aJ.state.spotShadowMap,V);if(aJ.state.pointShadowMap.length>0)NJ.setValue(T,"pointShadowMap",aJ.state.pointShadowMap,V)}if(g.isSkinnedMesh){NJ.setOptional(T,g,"bindMatrix"),NJ.setOptional(T,g,"bindMatrixInverse");let AJ=g.skeleton;if(AJ){if(AJ.boneTexture===null)AJ.computeBoneTexture();NJ.setValue(T,"boneTexture",AJ.boneTexture,V)}}if(g.isBatchedMesh){if(NJ.setOptional(T,g,"batchingTexture"),NJ.setValue(T,"batchingTexture",g._matricesTexture,V),NJ.setOptional(T,g,"batchingIdTexture"),NJ.setValue(T,"batchingIdTexture",g._indirectTexture,V),NJ.setOptional(T,g,"batchingColorTexture"),g._colorsTexture!==null)NJ.setValue(T,"batchingColorTexture",g._colorsTexture,V)}let u9=d.morphAttributes;if(u9.position!==void 0||u9.normal!==void 0||u9.color!==void 0)g0.update(g,d,H9);if(G8||T0.receiveShadow!==g.receiveShadow)T0.receiveShadow=g.receiveShadow,NJ.setValue(T,"receiveShadow",g.receiveShadow);if((p.isMeshStandardMaterial||p.isMeshLambertMaterial||p.isMeshPhongMaterial)&&p.envMap===null&&y.environment!==null)SJ.envMapIntensity.value=y.environmentIntensity;if(SJ.dfgLUT!==void 0)SJ.dfgLUT.value=v1();if(G8){if(NJ.setValue(T,"toneMappingExposure",k.toneMappingExposure),T0.needsLights)dU(SJ,l8);if(R0&&p.fog===!0)F0.refreshFogUniforms(SJ,R0);F0.refreshMaterialUniforms(SJ,p,K0,_0,B.state.transmissionRenderTarget[z.id]),V6.upload(T,wK(T0),SJ,V)}if(p.isShaderMaterial&&p.uniformsNeedUpdate===!0)V6.upload(T,wK(T0),SJ,V),p.uniformsNeedUpdate=!1;if(p.isSpriteMaterial)NJ.setValue(T,"center",g.center);if(NJ.setValue(T,"modelViewMatrix",g.modelViewMatrix),NJ.setValue(T,"normalMatrix",g.normalMatrix),NJ.setValue(T,"modelMatrix",g.matrixWorld),p.isShaderMaterial||p.isRawShaderMaterial){let AJ=p.uniformsGroups;for(let c9=0,u8=AJ.length;c9<u8;c9++){let _K=AJ[c9];X0.update(_K,H9),X0.bind(_K,H9)}}return H9}function dU(z,y){z.ambientLightColor.needsUpdate=y,z.lightProbe.needsUpdate=y,z.directionalLights.needsUpdate=y,z.directionalLightShadows.needsUpdate=y,z.pointLights.needsUpdate=y,z.pointLightShadows.needsUpdate=y,z.spotLights.needsUpdate=y,z.spotLightShadows.needsUpdate=y,z.rectAreaLights.needsUpdate=y,z.hemisphereLights.needsUpdate=y}function lU(z){return z.isMeshLambertMaterial||z.isMeshToonMaterial||z.isMeshPhongMaterial||z.isMeshStandardMaterial||z.isShadowMaterial||z.isShaderMaterial&&z.lights===!0}this.getActiveCubeFace=function(){return h},this.getActiveMipmapLevel=function(){return S},this.getRenderTarget=function(){return v},this.setRenderTargetTextures=function(z,y,d){let p=I.get(z);if(p.__autoAllocateDepthBuffer=z.resolveDepthBuffer===!1,p.__autoAllocateDepthBuffer===!1)p.__useRenderToTexture=!1;I.get(z.texture).__webglTexture=y,I.get(z.depthTexture).__webglTexture=p.__autoAllocateDepthBuffer?void 0:d,p.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(z,y){let d=I.get(z);d.__webglFramebuffer=y,d.__useDefaultFramebuffer=y===void 0};let uU=T.createFramebuffer();this.setRenderTarget=function(z,y=0,d=0){v=z,h=y,S=d;let p=null,g=!1,R0=!1;if(z){let k0=I.get(z);if(k0.__useDefaultFramebuffer!==void 0){H0.bindFramebuffer(T.FRAMEBUFFER,k0.__webglFramebuffer),c.copy(z.viewport),x.copy(z.scissor),m=z.scissorTest,H0.viewport(c),H0.scissor(x),H0.setScissorTest(m),l=-1;return}else if(k0.__webglFramebuffer===void 0)V.setupRenderTarget(z);else if(k0.__hasExternalTextures)V.rebindTextures(z,I.get(z.texture).__webglTexture,I.get(z.depthTexture).__webglTexture);else if(z.depthBuffer){let i0=z.depthTexture;if(k0.__boundDepthTexture!==i0){if(i0!==null&&I.has(i0)&&(z.width!==i0.image.width||z.height!==i0.image.height))throw Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");V.setupDepthRenderbuffer(z)}}let P0=z.texture;if(P0.isData3DTexture||P0.isDataArrayTexture||P0.isCompressedArrayTexture)R0=!0;let y0=I.get(z).__webglFramebuffer;if(z.isWebGLCubeRenderTarget){if(Array.isArray(y0[y]))p=y0[y][d];else p=y0[y];g=!0}else if(z.samples>0&&V.useMultisampledRTT(z)===!1)p=I.get(z).__webglMultisampledFramebuffer;else if(Array.isArray(y0))p=y0[d];else p=y0;c.copy(z.viewport),x.copy(z.scissor),m=z.scissorTest}else c.copy(i).multiplyScalar(K0).floor(),x.copy(G0).multiplyScalar(K0).floor(),m=V0;if(d!==0)p=uU;if(H0.bindFramebuffer(T.FRAMEBUFFER,p))H0.drawBuffers(z,p);if(H0.viewport(c),H0.scissor(x),H0.setScissorTest(m),g){let k0=I.get(z.texture);T.framebufferTexture2D(T.FRAMEBUFFER,T.COLOR_ATTACHMENT0,T.TEXTURE_CUBE_MAP_POSITIVE_X+y,k0.__webglTexture,d)}else if(R0){let k0=y;for(let P0=0;P0<z.textures.length;P0++){let y0=I.get(z.textures[P0]);T.framebufferTextureLayer(T.FRAMEBUFFER,T.COLOR_ATTACHMENT0+P0,y0.__webglTexture,d,k0)}}else if(z!==null&&d!==0){let k0=I.get(z.texture);T.framebufferTexture2D(T.FRAMEBUFFER,T.COLOR_ATTACHMENT0,T.TEXTURE_2D,k0.__webglTexture,d)}l=-1},this.readRenderTargetPixels=function(z,y,d,p,g,R0,I0,k0=0){if(!(z&&z.isWebGLRenderTarget)){j0("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let P0=I.get(z).__webglFramebuffer;if(z.isWebGLCubeRenderTarget&&I0!==void 0)P0=P0[I0];if(P0){H0.bindFramebuffer(T.FRAMEBUFFER,P0);try{let y0=z.textures[k0],i0=y0.format,t0=y0.type;if(z.textures.length>1)T.readBuffer(T.COLOR_ATTACHMENT0+k0);if(!x0.textureFormatReadable(i0)){j0("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!x0.textureTypeReadable(t0)){j0("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}if(y>=0&&y<=z.width-p&&(d>=0&&d<=z.height-g))T.readPixels(y,d,p,g,j.convert(i0),j.convert(t0),R0)}finally{let y0=v!==null?I.get(v).__webglFramebuffer:null;H0.bindFramebuffer(T.FRAMEBUFFER,y0)}}},this.readRenderTargetPixelsAsync=async function(z,y,d,p,g,R0,I0,k0=0){if(!(z&&z.isWebGLRenderTarget))throw Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let P0=I.get(z).__webglFramebuffer;if(z.isWebGLCubeRenderTarget&&I0!==void 0)P0=P0[I0];if(P0)if(y>=0&&y<=z.width-p&&(d>=0&&d<=z.height-g)){H0.bindFramebuffer(T.FRAMEBUFFER,P0);let y0=z.textures[k0],i0=y0.format,t0=y0.type;if(z.textures.length>1)T.readBuffer(T.COLOR_ATTACHMENT0+k0);if(!x0.textureFormatReadable(i0))throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!x0.textureTypeReadable(t0))throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let f0=T.createBuffer();T.bindBuffer(T.PIXEL_PACK_BUFFER,f0),T.bufferData(T.PIXEL_PACK_BUFFER,R0.byteLength,T.STREAM_READ),T.readPixels(y,d,p,g,j.convert(i0),j.convert(t0),0);let XJ=v!==null?I.get(v).__webglFramebuffer:null;H0.bindFramebuffer(T.FRAMEBUFFER,XJ);let MJ=T.fenceSync(T.SYNC_GPU_COMMANDS_COMPLETE,0);return T.flush(),await xY(T,MJ,4),T.bindBuffer(T.PIXEL_PACK_BUFFER,f0),T.getBufferSubData(T.PIXEL_PACK_BUFFER,0,R0),T.deleteBuffer(f0),T.deleteSync(MJ),R0}else throw Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(z,y=null,d=0){let p=Math.pow(2,-d),g=Math.floor(z.image.width*p),R0=Math.floor(z.image.height*p),I0=y!==null?y.x:0,k0=y!==null?y.y:0;V.setTexture2D(z,0),T.copyTexSubImage2D(T.TEXTURE_2D,d,0,0,I0,k0,g,R0),H0.unbindTexture()};let cU=T.createFramebuffer(),nU=T.createFramebuffer();if(this.copyTextureToTexture=function(z,y,d=null,p=null,g=0,R0=0){let I0,k0,P0,y0,i0,t0,f0,XJ,MJ,OJ=z.isCompressedTexture?z.mipmaps[R0]:z.image;if(d!==null)I0=d.max.x-d.min.x,k0=d.max.y-d.min.y,P0=d.isBox3?d.max.z-d.min.z:1,y0=d.min.x,i0=d.min.y,t0=d.isBox3?d.min.z:0;else{let SJ=Math.pow(2,-g);if(I0=Math.floor(OJ.width*SJ),k0=Math.floor(OJ.height*SJ),z.isDataArrayTexture)P0=OJ.depth;else if(z.isData3DTexture)P0=Math.floor(OJ.depth*SJ);else P0=1;y0=0,i0=0,t0=0}if(p!==null)f0=p.x,XJ=p.y,MJ=p.z;else f0=0,XJ=0,MJ=0;let UJ=j.convert(y.format),fJ=j.convert(y.type),T0;if(y.isData3DTexture)V.setTexture3D(y,0),T0=T.TEXTURE_3D;else if(y.isDataArrayTexture||y.isCompressedArrayTexture)V.setTexture2DArray(y,0),T0=T.TEXTURE_2D_ARRAY;else V.setTexture2D(y,0),T0=T.TEXTURE_2D;T.pixelStorei(T.UNPACK_FLIP_Y_WEBGL,y.flipY),T.pixelStorei(T.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),T.pixelStorei(T.UNPACK_ALIGNMENT,y.unpackAlignment);let aJ=T.getParameter(T.UNPACK_ROW_LENGTH),ZJ=T.getParameter(T.UNPACK_IMAGE_HEIGHT),H9=T.getParameter(T.UNPACK_SKIP_PIXELS),R9=T.getParameter(T.UNPACK_SKIP_ROWS),G8=T.getParameter(T.UNPACK_SKIP_IMAGES);T.pixelStorei(T.UNPACK_ROW_LENGTH,OJ.width),T.pixelStorei(T.UNPACK_IMAGE_HEIGHT,OJ.height),T.pixelStorei(T.UNPACK_SKIP_PIXELS,y0),T.pixelStorei(T.UNPACK_SKIP_ROWS,i0),T.pixelStorei(T.UNPACK_SKIP_IMAGES,t0);let l8=z.isDataArrayTexture||z.isData3DTexture,NJ=y.isDataArrayTexture||y.isData3DTexture;if(z.isDepthTexture){let SJ=I.get(z),u9=I.get(y),AJ=I.get(SJ.__renderTarget),c9=I.get(u9.__renderTarget);H0.bindFramebuffer(T.READ_FRAMEBUFFER,AJ.__webglFramebuffer),H0.bindFramebuffer(T.DRAW_FRAMEBUFFER,c9.__webglFramebuffer);for(let u8=0;u8<P0;u8++){if(l8)T.framebufferTextureLayer(T.READ_FRAMEBUFFER,T.COLOR_ATTACHMENT0,I.get(z).__webglTexture,g,t0+u8),T.framebufferTextureLayer(T.DRAW_FRAMEBUFFER,T.COLOR_ATTACHMENT0,I.get(y).__webglTexture,R0,MJ+u8);T.blitFramebuffer(y0,i0,I0,k0,f0,XJ,I0,k0,T.DEPTH_BUFFER_BIT,T.NEAREST)}H0.bindFramebuffer(T.READ_FRAMEBUFFER,null),H0.bindFramebuffer(T.DRAW_FRAMEBUFFER,null)}else if(g!==0||z.isRenderTargetTexture||I.has(z)){let SJ=I.get(z),u9=I.get(y);H0.bindFramebuffer(T.READ_FRAMEBUFFER,cU),H0.bindFramebuffer(T.DRAW_FRAMEBUFFER,nU);for(let AJ=0;AJ<P0;AJ++){if(l8)T.framebufferTextureLayer(T.READ_FRAMEBUFFER,T.COLOR_ATTACHMENT0,SJ.__webglTexture,g,t0+AJ);else T.framebufferTexture2D(T.READ_FRAMEBUFFER,T.COLOR_ATTACHMENT0,T.TEXTURE_2D,SJ.__webglTexture,g);if(NJ)T.framebufferTextureLayer(T.DRAW_FRAMEBUFFER,T.COLOR_ATTACHMENT0,u9.__webglTexture,R0,MJ+AJ);else T.framebufferTexture2D(T.DRAW_FRAMEBUFFER,T.COLOR_ATTACHMENT0,T.TEXTURE_2D,u9.__webglTexture,R0);if(g!==0)T.blitFramebuffer(y0,i0,I0,k0,f0,XJ,I0,k0,T.COLOR_BUFFER_BIT,T.NEAREST);else if(NJ)T.copyTexSubImage3D(T0,R0,f0,XJ,MJ+AJ,y0,i0,I0,k0);else T.copyTexSubImage2D(T0,R0,f0,XJ,y0,i0,I0,k0)}H0.bindFramebuffer(T.READ_FRAMEBUFFER,null),H0.bindFramebuffer(T.DRAW_FRAMEBUFFER,null)}else if(NJ)if(z.isDataTexture||z.isData3DTexture)T.texSubImage3D(T0,R0,f0,XJ,MJ,I0,k0,P0,UJ,fJ,OJ.data);else if(y.isCompressedArrayTexture)T.compressedTexSubImage3D(T0,R0,f0,XJ,MJ,I0,k0,P0,UJ,OJ.data);else T.texSubImage3D(T0,R0,f0,XJ,MJ,I0,k0,P0,UJ,fJ,OJ);else if(z.isDataTexture)T.texSubImage2D(T.TEXTURE_2D,R0,f0,XJ,I0,k0,UJ,fJ,OJ.data);else if(z.isCompressedTexture)T.compressedTexSubImage2D(T.TEXTURE_2D,R0,f0,XJ,OJ.width,OJ.height,UJ,OJ.data);else T.texSubImage2D(T.TEXTURE_2D,R0,f0,XJ,I0,k0,UJ,fJ,OJ);if(T.pixelStorei(T.UNPACK_ROW_LENGTH,aJ),T.pixelStorei(T.UNPACK_IMAGE_HEIGHT,ZJ),T.pixelStorei(T.UNPACK_SKIP_PIXELS,H9),T.pixelStorei(T.UNPACK_SKIP_ROWS,R9),T.pixelStorei(T.UNPACK_SKIP_IMAGES,G8),R0===0&&y.generateMipmaps)T.generateMipmap(T0);H0.unbindTexture()},this.initRenderTarget=function(z){if(I.get(z).__webglFramebuffer===void 0)V.setupRenderTarget(z)},this.initTexture=function(z){if(z.isCubeTexture)V.setTextureCube(z,0);else if(z.isData3DTexture)V.setTexture3D(z,0);else if(z.isDataArrayTexture||z.isCompressedArrayTexture)V.setTexture2DArray(z,0);else V.setTexture2D(z,0);H0.unbindTexture()},this.resetState=function(){h=0,S=0,v=null,H0.reset(),Y0.reset()},typeof __THREE_DEVTOOLS__<"u")__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return XW}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(J){this._outputColorSpace=J;let Q=this.getContext();Q.drawingBufferColorSpace=JJ._getDrawingBufferColorSpace(J),Q.unpackColorSpace=JJ._getUnpackColorSpace()}}var vU={type:"change"},LK={type:"start"},xU={type:"end"},M$=new m9,hU=new G9,x1=Math.cos(70*GW.DEG2RAD),wJ=new _,oJ=2*Math.PI,GJ={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},MK=0.000001;class gU extends E${constructor(J,Q=null){super(J,Q);if(this.state=GJ.NONE,this.target=new _,this.cursor=new _,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=0.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Q8.ROTATE,MIDDLE:Q8.DOLLY,RIGHT:Q8.PAN},this.touches={ONE:$8.ROTATE,TWO:$8.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new _,this._lastQuaternion=new zJ,this._lastTargetPosition=new _,this._quat=new zJ().setFromUnitVectors(J.up,new _(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new R6,this._sphericalDelta=new R6,this._scale=1,this._panOffset=new _,this._rotateStart=new s,this._rotateEnd=new s,this._rotateDelta=new s,this._panStart=new s,this._panEnd=new s,this._panDelta=new s,this._dollyStart=new s,this._dollyEnd=new s,this._dollyDelta=new s,this._dollyDirection=new _,this._mouse=new s,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=p1.bind(this),this._onPointerDown=g1.bind(this),this._onPointerUp=m1.bind(this),this._onContextMenu=i1.bind(this),this._onMouseWheel=u1.bind(this),this._onKeyDown=c1.bind(this),this._onTouchStart=n1.bind(this),this._onTouchMove=s1.bind(this),this._onMouseDown=d1.bind(this),this._onMouseMove=l1.bind(this),this._interceptControlDown=o1.bind(this),this._interceptControlUp=a1.bind(this),this.domElement!==null)this.connect(this.domElement);this.update()}set cursorStyle(J){if(this._cursorStyle=J,J==="grab")this.domElement.style.cursor="grab";else this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(J){super.connect(J),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(J){J.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=J}stopListenToKeyEvents(){if(this._domElementKeyEvents!==null)this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(vU),this.update(),this.state=GJ.NONE}pan(J,Q){this._pan(J,Q),this.update()}dollyIn(J){this._dollyIn(J),this.update()}dollyOut(J){this._dollyOut(J),this.update()}rotateLeft(J){this._rotateLeft(J),this.update()}rotateUp(J){this._rotateUp(J),this.update()}update(J=null){let Q=this.object.position;if(wJ.copy(Q).sub(this.target),wJ.applyQuaternion(this._quat),this._spherical.setFromVector3(wJ),this.autoRotate&&this.state===GJ.NONE)this._rotateLeft(this._getAutoRotationAngle(J));if(this.enableDamping)this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor;else this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi;let $=this.minAzimuthAngle,Z=this.maxAzimuthAngle;if(isFinite($)&&isFinite(Z)){if($<-Math.PI)$+=oJ;else if($>Math.PI)$-=oJ;if(Z<-Math.PI)Z+=oJ;else if(Z>Math.PI)Z-=oJ;if($<=Z)this._spherical.theta=Math.max($,Math.min(Z,this._spherical.theta));else this._spherical.theta=this._spherical.theta>($+Z)/2?Math.max($,this._spherical.theta):Math.min(Z,this._spherical.theta)}if(this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0)this.target.addScaledVector(this._panOffset,this.dampingFactor);else this.target.add(this._panOffset);this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let W=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{let K=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),W=K!=this._spherical.radius}if(wJ.setFromSpherical(this._spherical),wJ.applyQuaternion(this._quatInverse),Q.copy(this.target).add(wJ),this.object.lookAt(this.target),this.enableDamping===!0)this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor);else this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0);if(this.zoomToCursor&&this._performCursorZoom){let K=null;if(this.object.isPerspectiveCamera){let H=wJ.length();K=this._clampDistance(H*this._scale);let Y=H-K;this.object.position.addScaledVector(this._dollyDirection,Y),this.object.updateMatrixWorld(),W=!!Y}else if(this.object.isOrthographicCamera){let H=new _(this._mouse.x,this._mouse.y,0);H.unproject(this.object);let Y=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),W=Y!==this.object.zoom;let X=new _(this._mouse.x,this._mouse.y,0);X.unproject(this.object),this.object.position.sub(X).add(H),this.object.updateMatrixWorld(),K=wJ.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;if(K!==null)if(this.screenSpacePanning)this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(K).add(this.object.position);else if(M$.origin.copy(this.object.position),M$.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(M$.direction))<x1)this.object.lookAt(this.target);else hU.setFromNormalAndCoplanarPoint(this.object.up,this.target),M$.intersectPlane(hU,this.target)}else if(this.object.isOrthographicCamera){let K=this.object.zoom;if(this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),K!==this.object.zoom)this.object.updateProjectionMatrix(),W=!0}if(this._scale=1,this._performCursorZoom=!1,W||this._lastPosition.distanceToSquared(this.object.position)>MK||8*(1-this._lastQuaternion.dot(this.object.quaternion))>MK||this._lastTargetPosition.distanceToSquared(this.target)>MK)return this.dispatchEvent(vU),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0;return!1}_getAutoRotationAngle(J){if(J!==null)return oJ/60*this.autoRotateSpeed*J;else return oJ/60/60*this.autoRotateSpeed}_getZoomScale(J){let Q=Math.abs(J*0.01);return Math.pow(0.95,this.zoomSpeed*Q)}_rotateLeft(J){this._sphericalDelta.theta-=J}_rotateUp(J){this._sphericalDelta.phi-=J}_panLeft(J,Q){wJ.setFromMatrixColumn(Q,0),wJ.multiplyScalar(-J),this._panOffset.add(wJ)}_panUp(J,Q){if(this.screenSpacePanning===!0)wJ.setFromMatrixColumn(Q,1);else wJ.setFromMatrixColumn(Q,0),wJ.crossVectors(this.object.up,wJ);wJ.multiplyScalar(J),this._panOffset.add(wJ)}_pan(J,Q){let $=this.domElement;if(this.object.isPerspectiveCamera){let Z=this.object.position;wJ.copy(Z).sub(this.target);let W=wJ.length();W*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*J*W/$.clientHeight,this.object.matrix),this._panUp(2*Q*W/$.clientHeight,this.object.matrix)}else if(this.object.isOrthographicCamera)this._panLeft(J*(this.object.right-this.object.left)/this.object.zoom/$.clientWidth,this.object.matrix),this._panUp(Q*(this.object.top-this.object.bottom)/this.object.zoom/$.clientHeight,this.object.matrix);else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1}_dollyOut(J){if(this.object.isPerspectiveCamera||this.object.isOrthographicCamera)this._scale/=J;else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1}_dollyIn(J){if(this.object.isPerspectiveCamera||this.object.isOrthographicCamera)this._scale*=J;else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1}_updateZoomParameters(J,Q){if(!this.zoomToCursor)return;this._performCursorZoom=!0;let $=this.domElement.getBoundingClientRect(),Z=J-$.left,W=Q-$.top,K=$.width,H=$.height;this._mouse.x=Z/K*2-1,this._mouse.y=-(W/H)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(J){return Math.max(this.minDistance,Math.min(this.maxDistance,J))}_handleMouseDownRotate(J){this._rotateStart.set(J.clientX,J.clientY)}_handleMouseDownDolly(J){this._updateZoomParameters(J.clientX,J.clientX),this._dollyStart.set(J.clientX,J.clientY)}_handleMouseDownPan(J){this._panStart.set(J.clientX,J.clientY)}_handleMouseMoveRotate(J){this._rotateEnd.set(J.clientX,J.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let Q=this.domElement;this._rotateLeft(oJ*this._rotateDelta.x/Q.clientHeight),this._rotateUp(oJ*this._rotateDelta.y/Q.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(J){if(this._dollyEnd.set(J.clientX,J.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0)this._dollyOut(this._getZoomScale(this._dollyDelta.y));else if(this._dollyDelta.y<0)this._dollyIn(this._getZoomScale(this._dollyDelta.y));this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(J){this._panEnd.set(J.clientX,J.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(J){if(this._updateZoomParameters(J.clientX,J.clientY),J.deltaY<0)this._dollyIn(this._getZoomScale(J.deltaY));else if(J.deltaY>0)this._dollyOut(this._getZoomScale(J.deltaY));this.update()}_handleKeyDown(J){let Q=!1;switch(J.code){case this.keys.UP:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enableRotate)this._rotateUp(oJ*this.keyRotateSpeed/this.domElement.clientHeight)}else if(this.enablePan)this._pan(0,this.keyPanSpeed);Q=!0;break;case this.keys.BOTTOM:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enableRotate)this._rotateUp(-oJ*this.keyRotateSpeed/this.domElement.clientHeight)}else if(this.enablePan)this._pan(0,-this.keyPanSpeed);Q=!0;break;case this.keys.LEFT:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enableRotate)this._rotateLeft(oJ*this.keyRotateSpeed/this.domElement.clientHeight)}else if(this.enablePan)this._pan(this.keyPanSpeed,0);Q=!0;break;case this.keys.RIGHT:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enableRotate)this._rotateLeft(-oJ*this.keyRotateSpeed/this.domElement.clientHeight)}else if(this.enablePan)this._pan(-this.keyPanSpeed,0);Q=!0;break}if(Q)J.preventDefault(),this.update()}_handleTouchStartRotate(J){if(this._pointers.length===1)this._rotateStart.set(J.pageX,J.pageY);else{let Q=this._getSecondPointerPosition(J),$=0.5*(J.pageX+Q.x),Z=0.5*(J.pageY+Q.y);this._rotateStart.set($,Z)}}_handleTouchStartPan(J){if(this._pointers.length===1)this._panStart.set(J.pageX,J.pageY);else{let Q=this._getSecondPointerPosition(J),$=0.5*(J.pageX+Q.x),Z=0.5*(J.pageY+Q.y);this._panStart.set($,Z)}}_handleTouchStartDolly(J){let Q=this._getSecondPointerPosition(J),$=J.pageX-Q.x,Z=J.pageY-Q.y,W=Math.sqrt($*$+Z*Z);this._dollyStart.set(0,W)}_handleTouchStartDollyPan(J){if(this.enableZoom)this._handleTouchStartDolly(J);if(this.enablePan)this._handleTouchStartPan(J)}_handleTouchStartDollyRotate(J){if(this.enableZoom)this._handleTouchStartDolly(J);if(this.enableRotate)this._handleTouchStartRotate(J)}_handleTouchMoveRotate(J){if(this._pointers.length==1)this._rotateEnd.set(J.pageX,J.pageY);else{let $=this._getSecondPointerPosition(J),Z=0.5*(J.pageX+$.x),W=0.5*(J.pageY+$.y);this._rotateEnd.set(Z,W)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);let Q=this.domElement;this._rotateLeft(oJ*this._rotateDelta.x/Q.clientHeight),this._rotateUp(oJ*this._rotateDelta.y/Q.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(J){if(this._pointers.length===1)this._panEnd.set(J.pageX,J.pageY);else{let Q=this._getSecondPointerPosition(J),$=0.5*(J.pageX+Q.x),Z=0.5*(J.pageY+Q.y);this._panEnd.set($,Z)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(J){let Q=this._getSecondPointerPosition(J),$=J.pageX-Q.x,Z=J.pageY-Q.y,W=Math.sqrt($*$+Z*Z);this._dollyEnd.set(0,W),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);let K=(J.pageX+Q.x)*0.5,H=(J.pageY+Q.y)*0.5;this._updateZoomParameters(K,H)}_handleTouchMoveDollyPan(J){if(this.enableZoom)this._handleTouchMoveDolly(J);if(this.enablePan)this._handleTouchMovePan(J)}_handleTouchMoveDollyRotate(J){if(this.enableZoom)this._handleTouchMoveDolly(J);if(this.enableRotate)this._handleTouchMoveRotate(J)}_addPointer(J){this._pointers.push(J.pointerId)}_removePointer(J){delete this._pointerPositions[J.pointerId];for(let Q=0;Q<this._pointers.length;Q++)if(this._pointers[Q]==J.pointerId){this._pointers.splice(Q,1);return}}_isTrackingPointer(J){for(let Q=0;Q<this._pointers.length;Q++)if(this._pointers[Q]==J.pointerId)return!0;return!1}_trackPointer(J){let Q=this._pointerPositions[J.pointerId];if(Q===void 0)Q=new s,this._pointerPositions[J.pointerId]=Q;Q.set(J.pageX,J.pageY)}_getSecondPointerPosition(J){let Q=J.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[Q]}_customWheelEvent(J){let Q=J.deltaMode,$={clientX:J.clientX,clientY:J.clientY,deltaY:J.deltaY};switch(Q){case 1:$.deltaY*=16;break;case 2:$.deltaY*=100;break}if(J.ctrlKey&&!this._controlActive)$.deltaY*=10;return $}}function g1(J){if(this.enabled===!1)return;if(this._pointers.length===0)this.domElement.setPointerCapture(J.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp);if(this._isTrackingPointer(J))return;if(this._addPointer(J),J.pointerType==="touch")this._onTouchStart(J);else this._onMouseDown(J);if(this._cursorStyle==="grab")this.domElement.style.cursor="grabbing"}function p1(J){if(this.enabled===!1)return;if(J.pointerType==="touch")this._onTouchMove(J);else this._onMouseMove(J)}function m1(J){switch(this._removePointer(J),this._pointers.length){case 0:if(this.domElement.releasePointerCapture(J.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(xU),this.state=GJ.NONE,this._cursorStyle==="grab")this.domElement.style.cursor="grab";break;case 1:let Q=this._pointers[0],$=this._pointerPositions[Q];this._onTouchStart({pointerId:Q,pageX:$.x,pageY:$.y});break}}function d1(J){let Q;switch(J.button){case 0:Q=this.mouseButtons.LEFT;break;case 1:Q=this.mouseButtons.MIDDLE;break;case 2:Q=this.mouseButtons.RIGHT;break;default:Q=-1}switch(Q){case Q8.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(J),this.state=GJ.DOLLY;break;case Q8.ROTATE:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(J),this.state=GJ.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(J),this.state=GJ.ROTATE}break;case Q8.PAN:if(J.ctrlKey||J.metaKey||J.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(J),this.state=GJ.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(J),this.state=GJ.PAN}break;default:this.state=GJ.NONE}if(this.state!==GJ.NONE)this.dispatchEvent(LK)}function l1(J){switch(this.state){case GJ.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(J);break;case GJ.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(J);break;case GJ.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(J);break}}function u1(J){if(this.enabled===!1||this.enableZoom===!1||this.state!==GJ.NONE)return;J.preventDefault(),this.dispatchEvent(LK),this._handleMouseWheel(this._customWheelEvent(J)),this.dispatchEvent(xU)}function c1(J){if(this.enabled===!1)return;this._handleKeyDown(J)}function n1(J){switch(this._trackPointer(J),this._pointers.length){case 1:switch(this.touches.ONE){case $8.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(J),this.state=GJ.TOUCH_ROTATE;break;case $8.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(J),this.state=GJ.TOUCH_PAN;break;default:this.state=GJ.NONE}break;case 2:switch(this.touches.TWO){case $8.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(J),this.state=GJ.TOUCH_DOLLY_PAN;break;case $8.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(J),this.state=GJ.TOUCH_DOLLY_ROTATE;break;default:this.state=GJ.NONE}break;default:this.state=GJ.NONE}if(this.state!==GJ.NONE)this.dispatchEvent(LK)}function s1(J){switch(this._trackPointer(J),this.state){case GJ.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(J),this.update();break;case GJ.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(J),this.update();break;case GJ.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(J),this.update();break;case GJ.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(J),this.update();break;default:this.state=GJ.NONE}}function i1(J){if(this.enabled===!1)return;J.preventDefault()}function o1(J){if(J.key==="Control")this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0})}function a1(J){if(J.key==="Control")this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0})}export{i7 as warnOnce,q0 as warn,K5 as setConsoleFunction,s7 as log,H5 as getConsoleFunction,j0 as error,vY as createCanvasElement,wG as ZeroStencilOp,qG as ZeroSlopeEnding,cH as ZeroFactor,NG as ZeroCurvatureEnding,EG as WrapAroundEnding,PW as WireframeGeometry,X6 as WebXRController,tG as WebGPUCoordinateSystem,P1 as WebGLUtils,h1 as WebGLRenderer,iJ as WebGLRenderTarget,kK as WebGLCubeRenderTarget,XW as WebGLCoordinateSystem,pY as WebGLArrayRenderTarget,mY as WebGL3DRenderTarget,LW as VideoTexture,tY as VideoFrameTexture,O7 as VectorKeyframeTrack,qJ as Vector4,_ as Vector3,s as Vector2,M7 as VSMShadowMap,Z6 as UnsignedShortType,IZ as UnsignedShort5551Type,zZ as UnsignedShort4444Type,W8 as UnsignedIntType,VY as UnsignedInt5999Type,z7 as UnsignedInt248Type,BY as UnsignedInt101111Type,E9 as UnsignedByteType,XX as UniformsUtils,D0 as UniformsLib,jX as UniformsGroup,YK as Uniform,nY as Uint8ClampedBufferAttribute,cY as Uint8BufferAttribute,jQ as Uint32BufferAttribute,SQ as Uint16BufferAttribute,tU as UVMapping,Q$ as TubeGeometry,OG as TrianglesDrawMode,RG as TriangleStripDrawMode,kG as TriangleFanDrawMode,cJ as Triangle,J$ as TorusKnotGeometry,eQ as TorusGeometry,eG as TimestampQuery,QK as Timer,QU as TextureUtils,RX as TextureLoader,kJ as Texture,tQ as TetrahedronGeometry,wY as TangentSpaceNormalMap,$8 as TOUCH,qZ as SubtractiveBlending,mH as SubtractEquation,Y8 as StringKeyframeTrack,sG as StreamReadUsage,uG as StreamDrawUsage,aG as StreamCopyUsage,IX as StereoCamera,cG as StaticReadUsage,dG as StaticDrawUsage,iG as StaticCopyUsage,sH as SrcColorFactor,QY as SrcAlphaSaturateFactor,oH as SrcAlphaFactor,yQ as SpriteMaterial,EW as Sprite,pX as SpotLightHelper,cW as SpotLight,nQ as SplineCurve,G$ as SphericalHarmonics3,R6 as Spherical,D6 as SphereGeometry,TJ as Sphere,v9 as Source,DW as SkinnedMesh,mX as SkeletonHelper,bQ as Skeleton,LY as ShortType,N9 as ShapeUtils,JU as ShapePath,rQ as ShapeGeometry,e9 as Shape,TW as ShadowMaterial,Q9 as ShaderMaterial,A9 as ShaderLib,a0 as ShaderChunk,qW as Scene,EJ as SRGBTransfer,_Y as SRGBColorSpace,xZ as SIGNED_RG11_EAC_Format,ZW as SIGNED_RED_RGTC1_Format,KW as SIGNED_RED_GREEN_RGTC2_Format,vZ as SIGNED_R11_EAC_Format,aQ as RingGeometry,dH as ReverseSubtractEquation,_G as ReplaceStencilOp,OY as RepeatWrapping,SX as RenderTarget3D,_Q as RenderTarget,OZ as ReinhardToneMapping,CZ as RedIntegerFormat,CY as RedFormat,oW as RectAreaLight,bX as Raycaster,m9 as Ray,$$ as RawShaderMaterial,wZ as RGIntegerFormat,I7 as RGFormat,BG as RGDepthPacking,BQ as RGB_S3TC_DXT1_Format,_Z as RGB_PVRTC_4BPPV1_Format,PZ as RGB_PVRTC_2BPPV1_Format,yZ as RGB_ETC2_Format,jZ as RGB_ETC1_Format,QW as RGB_BPTC_UNSIGNED_Format,JW as RGB_BPTC_SIGNED_Format,ZG as RGBIntegerFormat,IY as RGBFormat,VG as RGBDepthPacking,CQ as RGBA_S3TC_DXT5_Format,IQ as RGBA_S3TC_DXT3_Format,zQ as RGBA_S3TC_DXT1_Format,TZ as RGBA_PVRTC_4BPPV1_Format,SZ as RGBA_PVRTC_2BPPV1_Format,fZ as RGBA_ETC2_EAC_Format,eZ as RGBA_BPTC_Format,nZ as RGBA_ASTC_8x8_Format,cZ as RGBA_ASTC_8x6_Format,uZ as RGBA_ASTC_8x5_Format,lZ as RGBA_ASTC_6x6_Format,dZ as RGBA_ASTC_6x5_Format,mZ as RGBA_ASTC_5x5_Format,pZ as RGBA_ASTC_5x4_Format,gZ as RGBA_ASTC_4x4_Format,tZ as RGBA_ASTC_12x12_Format,rZ as RGBA_ASTC_12x10_Format,oZ as RGBA_ASTC_10x8_Format,iZ as RGBA_ASTC_10x6_Format,sZ as RGBA_ASTC_10x5_Format,aZ as RGBA_ASTC_10x10_Format,AZ as RGBAIntegerFormat,C9 as RGBAFormat,LG as RGBADepthPacking,hZ as RG11_EAC_Format,vH as REVISION,$W as RED_RGTC1_Format,WW as RED_GREEN_RGTC2_Format,bZ as R11_EAC_Format,lW as QuaternionLinearInterpolant,A7 as QuaternionKeyframeTrack,zJ as Quaternion,cQ as QuadraticBezierCurve3,uQ as QuadraticBezierCurve,ZK as PropertyMixer,QJ as PropertyBinding,wX as PositionalAudio,K8 as PolyhedronGeometry,nX as PolarGridHelper,hQ as PointsMaterial,MW as Points,lX as PointLightHelper,nW as PointLight,rX as PlaneHelper,w7 as PlaneGeometry,G9 as Plane,PJ as PerspectiveCamera,o7 as Path,DK as PMREMGenerator,gH as PCFSoftShadowMap,e7 as PCFShadowMap,_7 as OrthographicCamera,gU as OrbitControls,iH as OneMinusSrcColorFactor,aH as OneMinusSrcAlphaFactor,JY as OneMinusDstColorFactor,tH as OneMinusDstAlphaFactor,ZY as OneMinusConstantColorFactor,KY as OneMinusConstantAlphaFactor,nH as OneFactor,F6 as OctahedronGeometry,AY as ObjectSpaceNormalMap,VX as ObjectLoader,$J as Object3D,D7 as NumberKeyframeTrack,gG as NotEqualStencilFunc,qY as NotEqualDepth,yY as NotEqualCompare,IG as NormalRGPacking,CG as NormalGAPacking,J6 as NormalBlending,FG as NormalAnimationBlendMode,q9 as NoToneMapping,zG as NoNormalPacking,f8 as NoColorSpace,I9 as NoBlending,fG as NeverStencilFunc,HY as NeverDepth,PY as NeverCompare,VZ as NeutralToneMapping,kY as NearestMipmapNearestFilter,$6 as NearestMipmapLinearFilter,eU as NearestMipMapNearestFilter,JG as NearestMipMapLinearFilter,Z8 as NearestFilter,EY as MultiplyOperation,EZ as MultiplyBlending,FY as MixOperation,RY as MirroredRepeatWrapping,lH as MinEquation,fW as MeshToonMaterial,Z$ as MeshStandardMaterial,jW as MeshPhysicalMaterial,yW as MeshPhongMaterial,bW as MeshNormalMaterial,hW as MeshMatcapMaterial,vW as MeshLambertMaterial,K$ as MeshDistanceMaterial,W$ as MeshDepthMaterial,d9 as MeshBasicMaterial,VJ as Mesh,uH as MaxEquation,m0 as Matrix4,n0 as Matrix3,XK as Matrix2,GW as MathUtils,N$ as MaterialLoader,oU as MaterialBlending,yJ as Material,Q8 as MOUSE,KG as LoopRepeat,HG as LoopPingPong,WG as LoopOnce,X$ as LoadingManager,RQ as LoaderUtils,dJ as Loader,HW as LinearTransfer,DZ as LinearToneMapping,W6 as LinearSRGBColorSpace,VQ as LinearMipmapNearestFilter,S8 as LinearMipmapLinearFilter,QG as LinearMipMapNearestFilter,$G as LinearMipMapLinearFilter,H$ as LinearInterpolant,sJ as LinearFilter,D9 as LineSegments,kW as LineLoop,xW as LineDashedMaterial,AW as LineCurve3,lQ as LineCurve,xJ as LineBasicMaterial,gX as Line3,x9 as Line,aW as LightProbe,l9 as Light,bG as LessStencilFunc,hG as LessEqualStencilFunc,FZ as LessEqualDepth,wQ as LessEqualCompare,XY as LessDepth,TY as LessCompare,Y6 as Layers,oQ as LatheGeometry,FW as LOD,$9 as KeyframeTrack,AG as KeepStencilOp,yG as InvertStencilOp,J5 as InterpolationSamplingType,Q5 as InterpolationSamplingMode,UG as InterpolateSmooth,XG as InterpolateLinear,YG as InterpolateDiscrete,GG as InterpolateBezier,g8 as Interpolant,A8 as InterleavedBufferAttribute,U6 as InterleavedBuffer,BZ as IntType,uY as Int8BufferAttribute,iY as Int32BufferAttribute,sY as Int16BufferAttribute,OW as InstancedMesh,yX as InstancedInterleavedBuffer,rW as InstancedBufferGeometry,_8 as InstancedBufferAttribute,SG as IncrementWrapStencilOp,PG as IncrementStencilOp,NW as ImageUtils,k7 as ImageLoader,BX as ImageBitmapLoader,iQ as IcosahedronGeometry,uX as HemisphereLightHelper,uW as HemisphereLight,p9 as HalfFloatType,z8 as Group,cX as GridHelper,xG as GreaterStencilFunc,pG as GreaterEqualStencilFunc,GY as GreaterEqualDepth,AQ as GreaterEqualCompare,NY as GreaterDepth,jY as GreaterCompare,YW as GLSL3,rG as GLSL1,fX as GLBufferAttribute,vQ as FrustumArray,b8 as Frustum,L7 as FrontSide,eY as FramebufferTexture,PQ as FogExp2,TQ as Fog,g9 as FloatType,B0 as Float32BufferAttribute,oY as Float16BufferAttribute,B9 as FileLoader,sQ as ExtrudeGeometry,xQ as ExternalTexture,F9 as EventDispatcher,J9 as Euler,MQ as EquirectangularRefractionMapping,kQ as EquirectangularReflectionMapping,vG as EqualStencilFunc,UY as EqualDepth,SY as EqualCompare,E6 as EllipseCurve,BW as EdgesGeometry,nG as DynamicReadUsage,lG as DynamicDrawUsage,oG as DynamicCopyUsage,eH as DstColorFactor,rH as DstAlphaFactor,z9 as DoubleSide,mQ as DodecahedronGeometry,mW as DiscreteInterpolant,sX as DirectionalLightHelper,sW as DirectionalLight,rU as DetachedBindMode,v8 as DepthTexture,y8 as DepthStencilFormat,j8 as DepthFormat,NX as DefaultLoadingManager,jG as DecrementWrapStencilOp,TG as DecrementStencilOp,lY as DataUtils,OX as DataTextureLoader,W9 as DataTexture,K6 as DataArrayTexture,H6 as Data3DTexture,hX as Cylindrical,N6 as CylinderGeometry,MZ as CustomToneMapping,pH as CustomBlending,_W as CurvePath,K9 as Curve,hH as CullFaceNone,sU as CullFaceFrontBack,xH as CullFaceFront,GZ as CullFaceBack,pW as CubicInterpolant,wW as CubicBezierCurve3,dQ as CubicBezierCurve,Q6 as CubeUVReflectionMapping,DX as CubeTextureLoader,C7 as CubeTexture,T8 as CubeRefractionMapping,B7 as CubeReflectionMapping,VW as CubeDepthTexture,eW as CubeCamera,E$ as Controls,$Y as ConstantColorFactor,WY as ConstantAlphaFactor,q6 as ConeGeometry,FX as CompressedTextureLoader,G6 as CompressedTexture,QX as CompressedCubeTexture,JX as CompressedArrayTexture,$5 as Compatibility,JJ as ColorManagement,Y$ as ColorKeyframeTrack,M0 as Color,vX as Clock,LQ as ClampToEdgeWrapping,pQ as CircleGeometry,RZ as CineonToneMapping,CW as CatmullRomCurve3,gQ as CapsuleGeometry,$X as CanvasTexture,iX as CameraHelper,O6 as Camera,V9 as Cache,MY as ByteType,tW as BufferGeometryLoader,u0 as BufferGeometry,HJ as BufferAttribute,oX as BoxHelper,h8 as BoxGeometry,aX as Box3Helper,jJ as Box3,xX as Box2,H8 as BooleanKeyframeTrack,fQ as Bone,dW as BezierInterpolant,RW as BatchedMesh,iU as BasicShadowMap,MG as BasicDepthPacking,nJ as BackSide,eX as AxesHelper,zX as AudioLoader,CX as AudioListener,q$ as AudioContext,AX as AudioAnalyser,$K as Audio,aU as AttachedBindMode,tX as ArrowHelper,JK as ArrayCamera,zW as ArcCurve,GX as AnimationUtils,PX as AnimationObjectGroup,TX as AnimationMixer,EX as AnimationLoader,R7 as AnimationClip,HK as AnimationAction,iW as AmbientLight,mG as AlwaysStencilFunc,YY as AlwaysDepth,fY as AlwaysCompare,zY as AlphaFormat,LZ as AgXToneMapping,NZ as AdditiveBlending,DG as AdditiveAnimationBlendMode,DY as AddOperation,V7 as AddEquation,kZ as ACESFilmicToneMapping};
