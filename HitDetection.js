"use strict";

function HitDetection(obj1,obj2,rad1,rad2){

	var C1 = tdl.add(ship.pos,tdl.mul(5,ship.facing));
	var C2 = tdl.add(ship.pos,tdl.mul(-5,ship.facing));
	var S1 = [[ship.pos[0],ship.pos[1],ship.pos[2],5], [C1[0],C1[1],C1[2],5], [C2[0],C2[1],C2[2],5]];
	
	var CS1 = tdl.add(chromeship.pos,tdl.mul(5,chromeship.facing));
	var CS2 = tdl.add(chromeship.pos,tdl.mul(-5,chromeship.facing));
	var CSS1 = [[chromeship.pos[0],chromeship.pos[1],chromeship.pos[2],5], [CS1[0],CS1[1],CS1[2],5], [CS2[0],CS2[1],CS2[2],5]];
	
	var N1 = tdl.add(nessie.pos,tdl.mul(5,nessie.facing));
	var N2 = tdl.add(nessie.pos,tdl.mul(-5,nessie.facing));
	var NS1 = [[nessie.pos[0],nessie.pos[1],nessie.pos[2],5], [N1[0],N1[1],N1[2],5], [N2[0],N2[1],N2[2],5]];
	
	var hit = "False";
	
	var lon = tdl.sub(obj1.pos, obj2.pos);
	var dlon = tdl.dot(lon,lon);
	var dist = (rad1 * rad1) + (rad2 * rad2);
	if(dlon <= dist){
		
		if(obj1 == chromeship){
			for(var j = 0; j <=2; j++){
				for(var k = 0; k <=2; k++){
					
					lon = tdl.sub(CSS1[j], NS1[k]);
					dlon = tdl.dot(lon,lon);
					dist = (CSS1[j][3] * CSS1[j][3]) + (NS1[k][3] * NS1[k][3]);
					if(dlon <= dist){
						hit = "True";
						
						// for nessie
						obj1.pos = tdl.add(obj1.pos,tdl.mul((dist-dlon)*.005,lon));
							
						if(obj1.pos[1] > 0 || obj1.pos[1] < 0){
							obj1.pos[1] = 0;
						}
						update_camera();
					}		
				}
			}
		}
		else{
			for(var j = 0; j <=2; j++){
				for(var k = 0; k <=2; k++){
					
					lon = tdl.sub(S1[j], NS1[k]);
					dlon = tdl.dot(lon,lon);
					dist = (S1[j][3] * S1[j][3]) + (NS1[k][3] * NS1[k][3]);
					if(dlon <= dist){
						hit = "True";
						//console.log(j,k)
						
						// for chromeship
						//obj1.pos = tdl.add(obj1.pos,tdl.mul((dist-dlon)*.001265,lon));
						
						// for nessie
						obj1.pos = tdl.add(obj1.pos,tdl.mul((dist-dlon)*.005,lon));
						
						if(obj1.pos[1] > 0 || obj1.pos[1] < 0){
							obj1.pos[1] = 0;
						}
						update_camera();
					}
				}
			}
		}
	}
	//console.log(hit)
	return hit;
}