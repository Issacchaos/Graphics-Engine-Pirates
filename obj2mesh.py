#!/usr/bin/env python3

#export from blender:
#   selection only: usually no
#   animation: no
#   Apply modifiers: yes
#   Include edges: yes
#   Include normals: yes
#   Include UVs: yes
#   Write materials: yes
#   Triangulate faces: yes
#   Write nurbs: no
#   Polygroups: yes
#   Objects as OBJ objects: yes
#   Forward: y forward
#   Up: Z up
#   Path mode: relative


#http://research.cs.wisc.edu/graphics/Courses/cs-838-1999/Jeff/BVH.html

import sys,struct,random,math,os.path,traceback


class Vector4(object):
    def __init__(self,x,y,z,w):
        self.x=x
        self.y=y
        self.z=z
        self.w=w
    def __add__(self,o):
        return Vector4(self.x+o.x,self.y+o.y,self.z+o.z,self.w+o.w)
    def __rmul__(self,o):
        return Vector4(o*self.x,o*self.y,o*self.z,o*self.w)
    def __sub__(self,o):
        return Vector4(self.x-o.x,self.y-o.y,self.z-o.z,self.w-o.w)
    def __repr__(self):
        return "[ %f , %f , %f , %f ]" % (self.x,self.y,self.z,self.w) 
def length(v):
    return dot(v,v)**0.5

def dot(v,w):
    assert v.w == 0.0 and w.w == 0.0
    return v.x*w.x+v.y*w.y+v.z*w.z+v.w*w.w

def cross(v,w):
    assert v.w == 0.0 and w.w == 0.0
    return Vector4( v.y*w.z-v.z*w.y, w.x*v.z-v.x*w.z, v.x*w.y-v.y*w.x, 0 )
    
def normalize(v):
    return  1.0/length(v) * v
    
class Matrix4(object):
    def __init__(self,v=None):
        self.M=[ [1,0,0,0] , [0,1,0,0] , [0,0,1,0], [0,0,0,1] ]
        if v != None:
            c=0
            for i in range(4):
                for j in range(4):
                    self.M[i][j] = v[c]
                    c+=1
                    
    def __mul__(self,o):
        R=Matrix4( [0,0,0,0,  0,0,0,0,  0,0,0,0,  0,0,0,0 ] )
        if type(o) == Matrix4:
            for i in range(4):
                for j in range(4):
                    s=0
                    for k in range(4):
                        s += self.M[i][k] * o.M[k][j]
                    R[i][j]=s
            return R
        elif type(o) == Vector4:
            R=[0,0,0,0]
            v=[o.x,o.y,o.z,o.w]
            for i in range(4):
                for j in range(4):
                    R[i] += self.M[i][j] * v[j]
            return Vector4(R[0],R[1],R[2],R[3])
        else:
            assert 0
    
    def transpose(self):
        R=Matrix4()
        for i in range(4):
            for j in range(4):
                R[i][j]=self.M[j][i]
        return R
        
    def __rmul__(self,o):
        v=[o.x,o.y,o.z,o.w]
        R=[0,0,0,0]
        for i in range(4):
            for j in range(4):
                   R[i] += v[j]*self.M[j][i] 

#simulate matrix multiply on two lists of lists
def matrix_multiply(M,N):
    R=[]
    nrm = len(M)
    ncm = len(M[0])
    nrn = len(N)
    ncn = len(N[0])
    assert ncm == nrn
    
    for i in range(nrm):
        R.append([])
        for j in range(ncn):
            summ=0
            for k in range(ncm):
                summ += M[i][k] * N[k][j]
            R[-1].append(summ)

    assert len(R) == nrm
    assert len(R[0]) == ncn
    return R
    
def padstr(s):
    if len(s) > 127:
        print("Filename too long:",s)
        assert 0
    while len(s)<128:
        s += "\0"
    return struct.pack("128s",s.encode())
    
def main(inobj,scale,inbvh,level):
    #construct output filename: replace obj with mesh
    idx=inobj.find(".obj")
    assert idx > 0
    
    stem = inobj[:idx]
    pfx=""
    
    idx=stem.rfind("/")
    if idx != -1:
        pfx=stem[:idx]
        stem=stem[idx+1:]
    
    print("Reading from",inobj,"...")
    
    ifp=open(inobj,"r")
    
    currmtl=None        #current material
    fverts=[None]       #all vertices from the file, 1-indexed
    fnorms=[Vector4(0,1,0,0)]       #all normals from file
    ftexs=[Vector4(0,0,0,0)]        #all texture coords from file
    mtls={}             #from mtllib file
    outs=[]             #all files we've outputted to (separate 'o' objects go to separate files)
    
    #tangents, binormals, and smoothed (averaged) vertex normals
    #key=vertex index as given in obj file; value=the combined vector
    tangents=[None]
    binormals=[None]
    snormals=[None]
    debug=[None]
    
    currgroup=None  #current polygon group ('g' lines)
    
    warned={}   #error conditions to warn about: So we don't print the same
                #message several times
    
    #data specific to one 'o' object
    class ObjDat:
        def __init__(self,oname):
            self.oname=oname
            self.outverts=[]    #vertices we'll be outputting. List of (vi,ti,ni,group) tuples
            self.outtris=[]     #list of (i0,i1,i2) triples of indices: Refers to outverts
            self.vdict={}   #(vi,ti,ni,groupnum) -> index in outverts
            self.nfwm={}    #mtl name -> num faces with that material. Used to choose which material
                            #we output
            
    #initialize with a dummy object
    objdats=[ObjDat("")]

    filedat = ifp.readlines()
    fidx=0
    while fidx < len(filedat):
        line=filedat[fidx].strip()
        fidx+=1
        lst=line.split()
        if len(line) == 0 or line[0] == "#":
            idx+=1
        elif lst[0] == "o":
            tmp=lst[1]
            objdats.append(ObjDat(tmp))
            print("------------Processing",tmp,"----------------")
            idx+=1
        elif lst[0] == "v":
            lst=line.split(" ")[1:]
            fverts.append( Vector4(scale*float(lst[0]),scale*float(lst[1]),scale*float(lst[2]),1.0) )
            tangents.append(Vector4(0,0,0,0))
            binormals.append(Vector4(0,0,0,0))
            snormals.append(Vector4(0,0,0,0))
            debug.append({})
        elif lst[0] == "vt":
            lst=line.split(" ")[1:]
            if lst[0] == "nan" or lst[1] == "nan":
                if "nantex" not in warned:
                    warned["nantex"]=1
                    print("Warning: NaN texcoords")
                ftexs.append(Vector4(0,0,0,1))
            else:
                ftexs.append( Vector4(float(lst[0]),float(lst[1]),0.0,1.0) )
        elif lst[0] == "vn":
            lst=line.split(" ")[1:]
            fnorms.append( Vector4(float(lst[0]),float(lst[1]),float(lst[2]),0.0))
        elif lst[0] == "g":
            tmp=lst[1]
            currgroup=tmp
        elif lst[0] == "f":
            lst=lst[1:]
            vis=[]
            tis=[]
            nis=[]
            if len(lst) != 3:
                if "nontriangles" not in warned:
                    print("!   Warning: Non-triangles found")
                    warned["nontriangles"]=True
            else:
                tri=[]
                for ii in range(3):
                    l2 = lst[ii].split("/")
                    
                    vi = int(l2[0])
                    
                    if len(l2) < 2 or len(l2[1]) == 0:
                        if "missingtex" not in warned:
                            warned["missingtex"]=True
                            print("Mesh is missing tex coords")
                        ti=0
                    else:
                        ti=int(l2[1])
                    
                    if len(l2) < 3 or len(l2[2]) == 0:
                        if "missingnorm" not in warned:
                            warned["missingnorm"]=True
                            print("Mesh is missing normals")
                        ni=0
                    else:
                        ni=int(l2[2])
                            
                    V=(vi,ti,ni,currgroup)
                    
                    if V not in objdats[-1].vdict:
                        objdats[-1].vdict[V]=len(objdats[-1].outverts)
                        objdats[-1].outverts.append(V)
                    vidx = objdats[-1].vdict[V]    
                    tri.append(vidx)
                        
                assert len(tri) == 3
                
                #compute faceted face normal;
                #we will average these together to get smooth
                #normals
                vidx=tri[0]
                vi0 = objdats[-1].outverts[vidx][0]
                ti0 = objdats[-1].outverts[vidx][1]
                vidx=tri[1]
                vi1 = objdats[-1].outverts[vidx][0]
                ti1 = objdats[-1].outverts[vidx][1]
                vidx=tri[2]
                vi2 = objdats[-1].outverts[vidx][0]
                ti2 = objdats[-1].outverts[vidx][1]
                
                v0 = fverts[vi0]
                v1 = fverts[vi1]
                v2 = fverts[vi2]
                vv1 = v1-v0
                vv2 = v2-v0
                fn=cross(vv1,vv2)
                if length(fn) == 0:
                    if "zeronormal" not in warned:
                        warned["zeronormal"]=1
                        print("Zero length normal:",v0,v1,v2)
                    fn=Vector4(0,1,0,0)
                        
                fn=normalize(fn)
                
                if  len(fverts) != len(snormals):
                    print(len(fverts),len(snormals))
                    assert 0
                    
                snormals[vi0] = snormals[vi0]+fn
                snormals[vi1] = snormals[vi1]+fn
                snormals[vi2] = snormals[vi2]+fn
                    
                
                #bump mapping
                #get texture coordinates
                t0 = ftexs[ti0]
                t1 = ftexs[ti1]
                t2 = ftexs[ti2]
                    
                #make all vertex coords be relative to vertex 0
                q0=Vector4(0,0,0,0)
                q1 = v1-v0
                q2 = v2-v0
                    
                #likewise with texture coords and tc 0
                r0 = Vector4(0,0,0,0)
                r1=t1-t0
                r2=t2-t0
                
                #do we need to account for wrapping?
                
                    
                #We know that:
                #  [ r1x  r1y ] [ Tx Ty Tz ] = [ q1x q1y q1z ]
                #  [ r2x  r2y ] [ Bx By Bz ]   [ q2x q2y q2z ]
                    
                #compute inverse of r1x matrix above. Call it R_1
                R_1=[
                    [ r2.y, -r1.y],
                    [-r2.x, r1.x ]
                ]
                tmp = (r1.x*r2.y-r2.x*r1.y)
                if tmp == 0.0:
                    if 'badtexcoord' not in warned:
                        warned['badtexcoord']=True
                        print("Bad texture coordinate: Degenerate triangle")
                        #print("r=")
                        #print("\t",r1)
                        #print("\t",r2)
                        #print("q=")
                        #print("\t",q1)
                        #print("\t",q2)
                        print("orig tri=")
                        print("\t",v0)
                        print("\t",v1)
                        print("\t",v2)
                        print("tex coord")
                        print("\t",t0)
                        print("\t",t1)
                        print("\t",t2)
                        #print(ti0,ti1,ti2)
                        #print(objdats[-1].outverts[-3:])
                        #print(lst)
                        #print(tri)
                        #print(objdats[-1].outverts[tri[0]])
                        #print(objdats[-1].outverts[tri[1]])
                        #print(objdats[-1].outverts[tri[2]])
                    T=Vector4(1,0,0,0)
                    B=Vector4(0,1,0,0)
                else:
                    tmp = 1.0/tmp
                    R_1[0][0] *= tmp
                    R_1[0][1] *= tmp
                    R_1[1][0] *= tmp
                    R_1[1][1] *= tmp
                
                    Q=[
                        [q1.x, q1.y, q1.z ],
                        [q2.x, q2.y, q2.z ] 
                    ]

                    TB = matrix_multiply(R_1,Q)
                
                    T=Vector4(TB[0][0],TB[0][1],TB[0][2],0)
                    B=Vector4(TB[1][0],TB[1][1],TB[1][2],0)
                    
                if length(T) == 0 or length(B) == 0 :
                    if not warned["zerotangent"]:
                        warned["zerotangent"]=True
                        print("Warning: Zero-length tangent or binormal vectors")
                    T=Vector4(1,0,0,0)
                    B=Vector4(0,1,0,0)
                    
                T=normalize(T)
                B=normalize(B)
                
                for vvi in [vi0,vi1,vi2]:
                    ot=tangents[vvi]    #debugging
                    
                    tangents[vvi] = tangents[vvi] + T
                    
                    debug[vvi]["contrib"+str(len(debug[vvi]))]=T
                    #if length(tangents[vvi]) == 0:
                    #    print()
                    #    print("Tangent became 0")
                    #    print(oname)
                    #    print("ot=",ot)
                    #    print("T=",T)
                    #    print("v=",v0,"\n   ",v1,"\n   ",v2)
                    #    z=[q for q in debug[vvi].keys()]
                    #    z.sort()
                    #    for q in z:
                    #        print(q,debug[vvi][q])
                    #    print()
                    #    print()
                    #    assert 0
                    
                    binormals[vvi] = binormals[vvi] + B
                
                objdats[-1].outtris.append( [tri[0],tri[1],tri[2]] )
                
            if currmtl == None:
                if "nomtl" not in warned:
                    print("!   Warning: No material on faces")
                    warned["nomtl"]=1
                    
            objdats[-1].nfwm[currmtl]+=1
            
        elif lst[0] == "mtllib":
            lst=line.split()
            fp2=open(os.path.join(pfx,lst[1]))
            for line in fp2:
                line=line.strip()
                lst=line.split()
                if len(lst) == 0 or line[0] == '#':
                    pass
                elif lst[0] == "newmtl":
                    if len(lst) == 1:
                        mname = None
                    else:
                        mname=lst[1]
                    mtls[mname]={}
                else:
                    if len(lst) == 2:
                        mtls[mname][lst[0]] = lst[1]
                    else:
                        mtls[mname][lst[0]] = lst[1:]
            fp2.close()
        elif lst[0] == "usemtl":
            if len(lst) == 1:
                currmtl = None
            else:
                currmtl=lst[1]
            if currmtl not in objdats[-1].nfwm:
                objdats[-1].nfwm[currmtl]=0
        else:
            #ignore
            pass
    
    
    #fix lengths and also orthonormalize
    for i in range(1,len(tangents)):
        T=tangents[i]
        B=binormals[i]
        N=snormals[i]
        if length(T) == 0 or length(B) == 0:
            if 'zerotangent2' not in warned:
                print("Warning: Zero length tangents after averaging")
                warned['zerotangent2']=True
            T=Vector4(1,0,0,0)
            B=Vector4(0,1,0,0)
            if length( cross(T,N) ) == 0:
                T=Vector4(0,1,0,0)
                B=Vector4(0,0,1,0)
        T = normalize(T)
        B = normalize(B)
        N = normalize(N)
        T=T-dot(T,N)*N
        if length(T) == 0:
            if "zerotangent" not in warned:
                print("Zero length tangent")
                warned["zerotangent"]=1
            T=Vector4(0,1,0,0)
            
        T=normalize(T)
        B=cross(T,N)
        B=normalize(B)
        tangents[i]=T
        binormals[i]=B
        snormals[i]=N
        
        
        
    if inbvh:
        bonelist,boneroot,bonemap=parse_bvh(inbvh)
    else:
        bonelist=None
        boneroot=None
        bonemap=None

    
    for od in objdats:
        if len(od.outverts)==0:
            continue 
            
        oname=od.oname
        an=stem+"_"+oname+".ascii.mesh"
        bn=stem+"_"+oname+".binary.mesh"
        aln=stem+"_"+oname+".asciiline.mesh"
        bln=stem+"_"+oname+".binaryline.mesh"
        print("    Writing to",an,"and",bn,"and",aln,"and",bln)
        
        outs.append( ("binarymesh",bn) )
        outs.append( ("binaryline",bln) )
    
        aofp=open(an,"w")
        bofp=open(bn,"wb")
        alofp=open(aln,"w")
        blofp=open(bln,"wb")
    
        L=[]
        for q in od.nfwm:
            if od.nfwm[q] > 0:
                L.append( (od.nfwm[q],q) )
        if len(L) > 1:
            print("!   Warning: More than one material used:",",".join([q[1] for q in L]))
        currmtl=L[-1][1]

        #level 1: header word, diffuse color, vertex count, vertices (XYZW), face count, indices
        #level 2: Textures: header, diffuse color, diffuse tex, vertex count, vertices (XYZWSTPQ), face count, indices
        #level 3: Lighting: header, diffuse, specular color, diffuse tex, vertex count, vertices (XYZWSTPQNxNyNzNw), face count, indices
        #level 5: Emission/specular maps: header, diffcol, speccol, difftex, emitmap, specmap, bbox, vcount, vdata, fcount, fdata
        #level 4: bounding box: hdr, diffcol, speccol, difftex, bbox, vcount, vdata, fcount, fdata
        #level 6: Bump maps: header word, diffcol, speccol, difftex,emap, smap, bmap, bbox, vcount, vertices (XYZWSTPQNxNyNzNwTxTyTzTw), face count, indices
        #           Note: This *ignores* the normals from the obj file and uses smoothed ones instead
        #level 7: Skeletal animation: Same as level 5 except Nw is replaced with group index
        #         and skeleton data appears after index data
    
        if level >= 2:  has_textures=True
        else:           has_textures=False
        if level >= 3:  has_lighting=True
        else:           has_lighting=False
        if level >= 5:  has_emap=True
        else:           has_emap=False
        if level >= 4:  has_bbox=True
        else:           has_bbox=False
        if level >= 6:  has_bumpmap=True
        else:           has_bumpmap=False
        if level >= 7:  has_anim=True
        else:           has_anim=False
    
        aofp.write(  "ASCII %02d\n" % level)
        bofp.write(  ("BINARY%02d" % level).encode() )
        alofp.write( "ASCII %02d\n" % level)
        blofp.write( ("LINE00%02d" % level).encode() )
    
    
        if currmtl == None:
            print("!   Warning: No material")
        
        texf=mtls[currmtl].get("map_Kd","")
        etexf=mtls[currmtl].get("map_Ka","")
        stexf=mtls[currmtl].get("map_Ks","")
        btexf=mtls[currmtl].get("map_Bump","")
        diffuse=mtls[currmtl].get("Kd")
        specular=mtls[currmtl].get("Ks")
        shininess=float(mtls[currmtl].get("Ns"))
        alpha=mtls[currmtl].get("d",1.0)
    

        diffuse=[float(q) for q in diffuse]
        specular=[float(q) for q in specular]
        if len(specular) >= 4:
            specular[3] = shininess
        else:
            specular.append(shininess)
            
        alpha=float(alpha)

        aofp.write("diffuse "+" ".join([str(q) for q in diffuse])+"\n")
        bofp.write( struct.pack("<ffff" , diffuse[0],diffuse[1],diffuse[2],alpha))

        if has_lighting:
            aofp.write("specular "+" ".join([str(q) for q in specular])+"\n")
            bofp.write(struct.pack("<ffff" , specular[0],specular[1],specular[2],specular[3]))
    
        if has_textures:
            aofp.write("basetexture "+texf+"\n")
            bofp.write(padstr(texf))
    
        if has_emap:
            #emission map
            aofp.write("emissiontexture "+etexf+"\n")
            bofp.write(padstr(etexf))
    
            #specular map
            aofp.write("spectexture "+stexf+"\n")
            bofp.write(padstr(stexf))
    
        if has_bumpmap:
            aofp.write(btexf+"\n")
            bofp.write(padstr(btexf))
        
        if has_bbox :
            #write bounding box
            bbox_min = Vector4(1E99,1E99,1E99,0)
            bbox_max = Vector4(-1E99,-1E99,-1E99,0)
            for v in od.outverts:
                vi=v[0]
                V=fverts[vi]
                if V.x < bbox_min.x:
                    bbox_min.x = V.x
                if V.x > bbox_max.x:
                    bbox_max.x = V.x
                if V.y < bbox_min.y:
                    bbox_min.y = V.y
                if V.y > bbox_max.y:
                    bbox_max.y = V.y
                if V.z < bbox_min.z:
                    bbox_min.z = V.z
                if V.z > bbox_max.z:
                    bbox_max.z = V.z
                
            aofp.write("bbox %f %f %f %f %f %f\n" % (bbox_min.x,bbox_min.y,bbox_min.z,
                bbox_max.x,bbox_max.y,bbox_max.z))
            bofp.write( struct.pack("<6f",bbox_min.x,bbox_min.y,bbox_min.z,
                bbox_max.x,bbox_max.y,bbox_max.z))
   
        #write the number of vertices
        if len(od.outverts) > 0xffff:
            print("!    Warning: Too many vertices")
        print("   ",len(od.outverts),"vertices",end=" ")
        aofp.write(str(len(od.outverts))+"\n")
        bofp.write( struct.pack( "<i",len(od.outverts) ) )
        alofp.write(str(len(od.outverts))+"\n")
        blofp.write( struct.pack("<i",len(od.outverts)))
            
        for v in od.outverts:
            vi=v[0]
            ti=v[1]
            ni=v[2]
            gname=v[3]     #group name
        
            V=fverts[vi]
        
            if ti == 0:
                T=Vector4(0,0,0,1)
            else:
                T=ftexs[ti]
            if ni == 0:
                N=Vector4(0,0,1,0)
            else:
                N=fnorms[ni]

            if has_bumpmap:
                #make sure we use the normal which is
                #orthogonal to tangent and binormal
                N=snormals[vi]
                
            TT=tangents[vi]
            B=binormals[vi]
            
            if has_anim:
                if gname not in bonemap:
                    #group of vertex doesn't correspond to anything
                    print("!   Warning: unknown group:",gname)
                    gi=-1
                else:
                    gi=bonemap[gname]
                N.w = gi    #which bone owns this vertex
        
                
            aofp.write("pos= % .5f % .5f % .5f % .1f" % (V.x,V.y,V.z,V.w))
            bofp.write( struct.pack("<4f",V.x,V.y,V.z,V.w))
            alofp.write("pos= %g %g %g %g\t" % (V.x,V.y,V.z,V.w))
            blofp.write(struct.pack("<4f",V.x,V.y,V.z,V.w))
        
            if has_textures:
                aofp.write(" tex= % .5f % .5f % .5f % .1f" % (T.x,T.y,T.z,T.w))
                bofp.write(struct.pack("<4f",T.x,T.y,T.z,T.w))
        
            if has_lighting:
                aofp.write(" norm= % .5f % .5f % .5f % .1f" % (N.x,N.y,N.z,N.w))
                bofp.write(struct.pack("<4f",N.x,N.y,N.z,N.w))
            
            if has_bumpmap:
                aofp.write(" tan= % .5f % .5f % .5f % .1f" % (TT.x,TT.y,TT.z,TT.w))
                bofp.write(struct.pack("<4f",TT.x,TT.y,TT.z,TT.w))
                #aofp.write(" bin= % .5f % .5f % .5f % .1f" % (B.x,B.y,B.z,B.w))
                #bofp.write(struct.pack("<4f",B.x,B.y,B.z,B.w))
            

            aofp.write("\n")
            alofp.write("\n")
        
        
        print(len(od.outtris*3),"triangle indices (",len(od.outtris),"triangles)")
        aofp.write(str(len(od.outtris*3))+"\n")
        bofp.write( struct.pack("<i",len(od.outtris*3)))
        alofp.write(str(len(od.outtris*6))+"\n")
        blofp.write(struct.pack("<i",len(od.outtris*6)))
    
        #triangles, as indices
        for q in od.outtris:
            aofp.write("%d %d %d\n" % (q[0],q[1],q[2]))
            bofp.write( struct.pack( "<3h",q[0],q[1],q[2]) )
            for zz in range(3):
                i1 = q[zz]
                i2 = q[(zz+1)%3]
                alofp.write("%d %d\n" % (i1,i2) )
                blofp.write( struct.pack("<2h",i1,i2))
            
        while bofp.tell() % 4:
            bofp.write(b'0')
    
        if has_anim:
            #write skeleton data
            aofp.write("num_bones %d\n" % len(bonelist) )
            bofp.write(struct.pack("<i",len(bonelist)))
            for b in bonelist:
                aofp.write("parent %d offset %g %g %g\n" % (b.parent,b.offset[0],b.offset[1],b.offset[2]))
                bofp.write(struct.pack("<4f", b.parent,b.offset[0],b.offset[1],b.offset[2]))
        
            #write animation information
            numframes=len(bonelist[0].framedata)
            aofp.write("num_frames %d\n" % numframes)
            bofp.write("<i",numframes)
            for i in range(numframes):

                #overall translation for this frame
                Q,T = get_quat_trans(boneroot,i)
                if T == None:
                    T=[0,0,0]
                aofp.write("translation %g %g %g\n" % (T[0],T[1],T[2]) )
                bofp.write(struct.pack("<4f",T[0],T[1],T[2],0))
        
                for b in bonelist:
                    T=b.trans[i]
                    Q=b.quats[i]
                    if T != None and b.parent != None:
                        assert 0
                    aofp.write("quaternion %g %g %g %g\n" % (Q[0],Q[1],Q[2],Q[3]) )
                    bofp.write(struct.pack("<4f",Q[0],Q[1],Q[2],Q[3]))

        aofp.close()
        bofp.close()
        alofp.close()
        blofp.close()
        
    fname = stem+".spec.mesh"
    fp=open(fname,"w")
    for ty,o in outs:
        fp.write(ty+" "+o+"\n")
    fp.close()
    
    print("------------------------")
    print("Spec file:",fname)
    print("Done")
    return 

def compute_quat_trans(b,frame):
    tx=None
    ty=None
    tz=None
    M=Matrix4()
    fd = b.framedata[frame]
    
    for i in range(len(b.channels)):
        ch=b.channels[i]
        val=fd[i]
        if ch == "Xposition":
            tx=val
        elif ch == "Yposition":
            ty=val
        elif ch == "Zposition":
            tz=val
        else:
            val=val/180.0*math.PI
            c=math.cos(math.radians(val))
            s=math.sin(math.radians(val))
            
            #using matrices for premultiply: p'=p*M
            if ch == "Xrotation":
                M = M * Matrix4( [  1,0,0,0,
                                    0,c,s,0,
                                    0,-s,c,0,
                                    0,0,0,1])
            elif ch == "Yrotation":
                M = M * Matrix4( [  c,0,-s,0,
                                    0,1,0,0,
                                    s,0,c,0,
                                    0,0,0,1])
            elif ch == "Zrotation":
                M = M * Matrix4( [  c,s,0,0,
                                    -s,c,0,0,
                                    0,0,1,0,
                                    0,0,0,1])
            else:
                assert 0
       
    #convert M to quaternion
    #from Watt & Watt, 362
    # and http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm
    # and http://www.j3d.org/matrix_faq/matrfaq_latest.html
    
    #Watt assumes we have matrices for postmultiply: p'=M*p
    M=M.transpose()
    M=M.M
    tt = M[0][0]+M[1][1]+M[2][2]
    tr = tt + 1.0
    w=(tr**0.5)*0.5
    if tt < 1E-5:
        if M[0][0] >= M[1][1] and M[0][0] >= M[2][2]:
            tmp=(1.0+M[0][0]-M[1][1]-M[2][2])**0.5
            tmp *= 2.0
            w=(M[2][1]-M[1][2])/tmp
            x=tmp/4
            y=(M[0][1]+M[1][0])/tmp
            z=(M[0][2]+M[2][0])/tmp
        elif M[1][1] >= M[0][0] and M[1][1] >= M[2][2]:
            tmp=(1.0-M[0][0]+M[1][1]-M[2][2])**0.5
            tmp *= 2.0
            w=(M[0][2]-M[2][0])/tmp
            x=(M[0][1]+M[1][0])/tmp
            y=tmp/4
            z=(M[1][2]+M[2][1])/tmp
        elif M[2][2] >= M[0][0] and M[2][2] >= M[1][1]:
            tmp=(1.0-M[0][0]-M[1][1]+M[2][2])**0.5
            tmp *= 2.0
            w=(M[1][0]-M[0][1])/tmp
            x=(M[0][2]+M[2][0])/tmp
            y=(M[1][2]+M[2][1])/tmp
            z=tmp/4
        else:
            assert 0
    else:
        x=M[2][1]-M[1][2]
        y=M[0][2]-M[2][0]
        z=M[1][0]-M[0][1]
        x/=4.0*w
        y/=4.0*w
        z/=4.0*w
        
        
    if tx == None:
        T=None
    else:
        T=[tx,ty,tz]
    
    Q=[x,y,z,w]
    
    #ensure we don't have discontinuous quaternions
    if frame > 0:
        #previous quaternion
        pQ = b.quats[frame-1]
        
        #same rotation as Q but diametrically opposite in quaternion space
        nQ = [-x,-y,-z,-w]
        
        dp1 = pQ[0]* Q[0]+pQ[1]* Q[1]+pQ[2]* Q[2]+pQ[3]* Q[3]
        dp2 = pq[0]*nQ[0]+pQ[1]*nQ[1]+pQ[2]*nQ[2]+pQ[3]*nQ[3]
        if dp1 > dp2:
            #choose Q
            pass
        else:
            #choose nQ
            Q=nQ
            
    return Q,T
    

class Bone:
    def __init__(self,name,parent):
        self.name=name 
        self.num=None
        self.parent=parent
        self.ch=[]
        self.channels=[]
        self.framedata=[]
        self.offset=None
        self.quats=[]
        self.trans=[]

class TokenList:
    def __init__(self,fp):
        self.dat = fp.read().split()
        self.idx=0
    def next(self):
        if self.idx >= len(self.dat):
            return None 
        else:
            x=self.dat[self.idx]
            self.idx+=1
            return x
    def peek(self):
        if self.idx >= len(self.dat):
            return None 
        else:
            return self.dat[self.idx]
            
def parse_bvh(bvhfile):
    fp=open(bvhfile)
    T=TokenList(fp)
    assert T.next() == "HIERARCHY"
    assert T.next() == "ROOT"
    name = T.next()
    root = Bone(name,None)
    bonelist=[root]
    parse_block(T,root,bonelist)
    assert T.next() == "MOTION"
    assert T.next() == "Frames:"
    numframes=int(T.next())
    assert T.next() == "Frame"
    assert T.next() == "Time:"
    T.next()
    
    for i in range(numframes):
        for b in bonelist:
            L=[]
            for j in range(b.channels.length):
                f=float(T.next())
                L.append(f)
            b.framedata.append(L)
            T,Q=compute_quat_trans(b,i)
            b.quats.append(Q)
            b.trans.append(Q)
    
    
    bonemap={}
    for bi in range(len(bonelist)):
        b=bonelist[bi]
        bonemap[b.name]=bi
     
    return bonelist,root,bonemap
    
def parse_block(T,b,bonelist):
    assert T.next() == "{"
    while 1:
        ty = T.next()
        if ty == "OFFSET":
            x=float(T.next())
            y=float(T.next())
            z=float(T.next())
            b.offset=[x,y,z]
        elif ty == "CHANNELS":
            nc = int(T.next())
            for i in range(nc):
                b.channels.append(T.next())
        elif ty == "JOINT":
            name=T.next()
            nb=Bone(name,b)
            bonelist.append(nb)
            b.ch.append(nb)
            parse_block(T,nb,bonelist)
        elif ty == "End":
            ty = T.next()
            if ty == "Site":
                dummy=Bone("?")
                parse_block(T,dummy,bonelist)
            else:
                assert 0
        elif ty == "}":
            return 


meshfile=None
scale=None
level=None

if len(sys.argv) > 1:
    meshfile=sys.argv[1]
if len(sys.argv) > 2:
    scale=float(sys.argv[2])
if len(sys.argv) > 3:
    level = int(sys.argv[3])
     
levels=[None,"Basic","Textures","Lighting","Bounding Box","Emission Maps","Bump Map"]

have_tk=False
try:
    from tkinter import *
    from tkinter.filedialog import *
    from tkinter.simpledialog import *
    from tkinter.messagebox import *
    have_tk=True
    root=Tk()
    root.withdraw()
except Exception:
    pass

if meshfile == None:
    if have_tk:
        meshfile=askopenfilename(filetypes=[("Any","*")])
    else:
        meshfile=input("Mesh file? ")
if not meshfile:
    sys.exit(0)
if scale == None:
    if have_tk:
        scale = askfloat("Scale","Scale factor?")
    else:
        scale=float(input("Scale factor? "))
if not scale:
    sys.exit(0)
    
if level == None:
    if have_tk:
        def set_level():
            global level
            idx = lbox.curselection()
            idx=int(idx[0])
            level=idx+1
            t.destroy()
            
        t=Toplevel(root)
        ys = Scrollbar(t,orient=VERTICAL)
        xs = Scrollbar(t,orient=HORIZONTAL)
        ys.grid(row=0,column=1,sticky=NS)
        xs.grid(row=1,column=0,sticky=EW)
        lbox = Listbox(t,xscrollcommand=xs.set,yscrollcommand=ys.set);
        lbox.grid(row=0,column=0,sticky=NSEW)
        xs["command"]=lbox.xview
        ys["command"]=lbox.yview
        b=Button(t,text="OK",command=set_level)
        b.grid(row=2,column=0)
        
        for x in levels:
            lbox.insert(END,x)
            
        t.wait_window(t)
        
    else:
        for i in range(1,len(levels)):
            print(i,":",levels[i])
        level=int(input("Level? "))
try:
    main(meshfile,scale,None,level)
except Exception as e:
    if have_tk:
        showerror("Error",traceback.format_exc())
    else:
        print(traceback.format_exc())
        input("What do? ")
        
