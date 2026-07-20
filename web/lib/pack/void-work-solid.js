// src/ext/manifold.js
async function Module(moduleArg = {}) {
  var moduleRtn;
  var Module2 = moduleArg;
  var ENVIRONMENT_IS_WEB = !!globalThis.window;
  var ENVIRONMENT_IS_WORKER = !!globalThis.WorkerGlobalScope;
  var ENVIRONMENT_IS_NODE = globalThis.process?.versions?.node && globalThis.process?.type != "renderer";
  if (ENVIRONMENT_IS_NODE) {
    const { createRequire } = await import("node:module");
    var require2 = createRequire(import.meta.url);
  }
  var _ManifoldInitialized = false;
  Module2.setup = function() {
    if (_ManifoldInitialized) return;
    _ManifoldInitialized = true;
    Module2.initTBB();
    function toVec(vec, list, f = ((x) => x)) {
      if (list) {
        for (let x of list) {
          vec.push_back(f(x));
        }
      }
      return vec;
    }
    function fromVec(vec, f = ((x) => x)) {
      const result = [];
      const size = vec.size();
      for (let i = 0; i < size; i++) result.push(f(vec.get(i)));
      return result;
    }
    function vec2polygons(vec, f = ((x) => x)) {
      const result = [];
      const nPoly = vec.size();
      for (let i = 0; i < nPoly; i++) {
        const v = vec.get(i);
        const nPts = v.size();
        const poly = [];
        for (let j = 0; j < nPts; j++) {
          poly.push(f(v.get(j)));
        }
        result.push(poly);
      }
      return result;
    }
    function polygons2vec(polygons) {
      if (polygons[0].length < 3) {
        polygons = [polygons];
      }
      return toVec(new Module2.Vector2_vec2(), polygons, (poly) => toVec(new Module2.Vector_vec2(), poly, (p) => {
        if (p instanceof Array) return { x: p[0], y: p[1] };
        return p;
      }));
    }
    function disposePolygons(polygonsVec) {
      for (let i = 0; i < polygonsVec.size(); i++) polygonsVec.get(i).delete();
      polygonsVec.delete();
    }
    function vararg2vec2(vec) {
      if (vec[0] instanceof Array) return { x: vec[0][0], y: vec[0][1] };
      if (typeof vec[0] == "number") return { x: vec[0] || 0, y: vec[1] || 0 };
      return vec[0];
    }
    function vararg2vec3(vec) {
      if (vec[0] instanceof Array) return { x: vec[0][0], y: vec[0][1], z: vec[0][2] };
      if (typeof vec[0] == "number") return { x: vec[0] || 0, y: vec[1] || 0, z: vec[2] || 0 };
      return vec[0];
    }
    function fillRuleToInt(fillRule) {
      return fillRule == "EvenOdd" ? 0 : fillRule == "NonZero" ? 1 : fillRule == "Negative" ? 3 : 2;
    }
    function joinTypeToInt(joinType) {
      return joinType == "Round" ? 1 : joinType == "Miter" ? 2 : 0;
    }
    const CrossSectionCtor = Module2.CrossSection;
    function cross2(polygons, fillRule = "Positive") {
      if (polygons instanceof CrossSectionCtor) {
        return polygons;
      } else {
        const polygonsVec = polygons2vec(polygons);
        const cs = new CrossSectionCtor(polygonsVec, fillRuleToInt(fillRule));
        disposePolygons(polygonsVec);
        return cs;
      }
    }
    Module2.CrossSection.prototype.translate = function(...vec) {
      return this._Translate(vararg2vec2(vec));
    };
    Module2.CrossSection.prototype.scale = function(vec) {
      if (typeof vec == "number") {
        return this._Scale({ x: vec, y: vec });
      }
      return this._Scale(vararg2vec2([vec]));
    };
    Module2.CrossSection.prototype.mirror = function(vec) {
      return this._Mirror(vararg2vec2([vec]));
    };
    Module2.CrossSection.prototype.warp = function(func) {
      const wasmFuncPtr = addFunction(function(vec2Ptr) {
        const x = getValue(vec2Ptr, "double");
        const y = getValue(vec2Ptr + 8, "double");
        const vert = [x, y];
        func(vert);
        setValue(vec2Ptr, vert[0], "double");
        setValue(vec2Ptr + 8, vert[1], "double");
      }, "vi");
      const out2 = this._Warp(wasmFuncPtr);
      removeFunction(wasmFuncPtr);
      return out2;
    };
    Module2.CrossSection.prototype.decompose = function() {
      const vec = this._Decompose();
      const result = fromVec(vec);
      vec.delete();
      return result;
    };
    Module2.CrossSection.prototype.bounds = function() {
      const result = this._Bounds();
      return { min: ["x", "y"].map((f) => result.min[f]), max: ["x", "y"].map((f) => result.max[f]) };
    };
    Module2.CrossSection.prototype.offset = function(delta, joinType = "Round", miterLimit = 2, circularSegments = 0) {
      return this._Offset(delta, joinTypeToInt(joinType), miterLimit, circularSegments);
    };
    Module2.CrossSection.prototype.simplify = function(epsilon = 1e-6) {
      return this._Simplify(epsilon);
    };
    Module2.CrossSection.prototype.extrude = function(height, nDivisions = 0, twistDegrees = 0, scaleTop = [1, 1], center = false) {
      scaleTop = vararg2vec2([scaleTop]);
      const man = Module2._Extrude(this._ToPolygons(), height, nDivisions, twistDegrees, scaleTop);
      return center ? man.translate([0, 0, -height / 2]) : man;
    };
    Module2.CrossSection.prototype.revolve = function(circularSegments = 0, revolveDegrees = 360) {
      return Module2._Revolve(this._ToPolygons(), circularSegments, revolveDegrees);
    };
    Module2.CrossSection.prototype.add = function(other) {
      return this._add(cross2(other));
    };
    Module2.CrossSection.prototype.subtract = function(other) {
      return this._subtract(cross2(other));
    };
    Module2.CrossSection.prototype.intersect = function(other) {
      return this._intersect(cross2(other));
    };
    Module2.CrossSection.prototype.toPolygons = function() {
      const vec = this._ToPolygons();
      const result = vec2polygons(vec, (v) => [v.x, v.y]);
      vec.delete();
      return result;
    };
    Module2.Manifold.prototype.smoothOut = function(minSharpAngle = 52.5, minSmoothness = 0) {
      return this._SmoothOut(minSharpAngle, minSmoothness);
    };
    Module2.Manifold.prototype.warp = function(func) {
      const wasmFuncPtr = addFunction(function(vec3Ptr) {
        const x = getValue(vec3Ptr, "double");
        const y = getValue(vec3Ptr + 8, "double");
        const z = getValue(vec3Ptr + 16, "double");
        const vert = [x, y, z];
        func(vert);
        setValue(vec3Ptr, vert[0], "double");
        setValue(vec3Ptr + 8, vert[1], "double");
        setValue(vec3Ptr + 16, vert[2], "double");
      }, "vi");
      const out2 = this._Warp(wasmFuncPtr);
      removeFunction(wasmFuncPtr);
      const status = out2.status();
      if (status !== "NoError") {
        throw new Module2.ManifoldError(status);
      }
      return out2;
    };
    Module2.Manifold.prototype.warpBatch = function(func) {
      const wasmFuncPtr = addFunction(function(ptr, count) {
        const heapF64 = Module2.HEAPF64 ?? HEAPF64;
        if (!heapF64) {
          throw new Error("WASM heap is not initialized (HEAPF64 unavailable)");
        }
        const verts = new Float64Array(heapF64.buffer, ptr, count * 3);
        func(verts, count);
      }, "vii");
      const out2 = this._WarpBatch(wasmFuncPtr);
      removeFunction(wasmFuncPtr);
      const status = out2.status();
      if (status !== "NoError") {
        throw new Module2.ManifoldError(status);
      }
      return out2;
    };
    Module2.Manifold.prototype.calculateNormals = function(normalIdx = 0, minSharpAngle = 52.5) {
      return this._CalculateNormals(normalIdx, minSharpAngle);
    };
    Module2.Manifold.prototype.smoothByNormals = function(normalIdx = 0) {
      return this._SmoothByNormals(normalIdx);
    };
    Module2.Manifold.prototype.setProperties = function(numProp, func) {
      const oldNumProp = this.numProp();
      const wasmFuncPtr = addFunction(function(newPtr, vec3Ptr, oldPtr) {
        const newProp = [];
        for (let i = 0; i < numProp; ++i) {
          newProp[i] = getValue(newPtr + 8 * i, "double");
        }
        const pos = [];
        for (let i = 0; i < 3; ++i) {
          pos[i] = getValue(vec3Ptr + 8 * i, "double");
        }
        const oldProp = [];
        for (let i = 0; i < oldNumProp; ++i) {
          oldProp[i] = getValue(oldPtr + 8 * i, "double");
        }
        func(newProp, pos, oldProp);
        for (let i = 0; i < numProp; ++i) {
          setValue(newPtr + 8 * i, newProp[i], "double");
        }
      }, "viii");
      const out2 = this._SetProperties(numProp, wasmFuncPtr);
      removeFunction(wasmFuncPtr);
      return out2;
    };
    Module2.Manifold.prototype.translate = function(...vec) {
      return this._Translate(vararg2vec3(vec));
    };
    Module2.Manifold.prototype.rotate = function(xOrVec, y, z) {
      if (Array.isArray(xOrVec)) {
        return this._Rotate(...xOrVec);
      } else {
        return this._Rotate(xOrVec, y || 0, z || 0);
      }
    };
    Module2.Manifold.prototype.scale = function(vec) {
      if (typeof vec == "number") {
        return this._Scale({ x: vec, y: vec, z: vec });
      }
      return this._Scale(vararg2vec3([vec]));
    };
    Module2.Manifold.prototype.mirror = function(vec) {
      return this._Mirror(vararg2vec3([vec]));
    };
    Module2.Manifold.prototype.trimByPlane = function(normal, offset = 0) {
      return this._TrimByPlane(vararg2vec3([normal]), offset);
    };
    Module2.Manifold.prototype.slice = function(height = 0) {
      const polygonsVec = this._Slice(height);
      const result = new CrossSectionCtor(polygonsVec, fillRuleToInt("Positive"));
      disposePolygons(polygonsVec);
      return result;
    };
    Module2.Manifold.prototype.project = function() {
      const polygonsVec = this._Project();
      const result = new CrossSectionCtor(polygonsVec, fillRuleToInt("Positive"));
      disposePolygons(polygonsVec);
      return result;
    };
    Module2.Manifold.prototype.rayCast = function(origin, endpoint) {
      const vec = this._RayCast(vararg2vec3([origin]), vararg2vec3([endpoint]));
      const result = fromVec(vec, (hit) => ({ faceID: hit.faceID, distance: hit.distance, position: ["x", "y", "z"].map((f) => hit.position[f]), normal: ["x", "y", "z"].map((f) => hit.normal[f]) }));
      vec.delete();
      return result;
    };
    Module2.Manifold.prototype.split = function(manifold) {
      const vec = this._Split(manifold);
      const result = fromVec(vec);
      vec.delete();
      return result;
    };
    Module2.Manifold.prototype.splitByPlane = function(normal, offset = 0) {
      const vec = this._SplitByPlane(vararg2vec3([normal]), offset);
      const result = fromVec(vec);
      vec.delete();
      return result;
    };
    Module2.Manifold.prototype.decompose = function() {
      const vec = this._Decompose();
      const result = fromVec(vec);
      vec.delete();
      return result;
    };
    Module2.Manifold.prototype.boundingBox = function() {
      const result = this._boundingBox();
      return { min: ["x", "y", "z"].map((f) => result.min[f]), max: ["x", "y", "z"].map((f) => result.max[f]) };
    };
    Module2.Manifold.prototype.simplify = function(tolerance = 0) {
      return this._Simplify(tolerance);
    };
    class Mesh {
      constructor({ numProp = 3, triVerts = new Uint32Array(), vertProperties = new Float32Array(), mergeFromVert, mergeToVert, runIndex, runOriginalID, faceID, halfedgeTangent, runTransform, runFlags, tolerance = 0 } = {}) {
        this.numProp = numProp;
        this.triVerts = triVerts;
        this.vertProperties = vertProperties;
        this.mergeFromVert = mergeFromVert;
        this.mergeToVert = mergeToVert;
        this.runIndex = runIndex;
        this.runOriginalID = runOriginalID;
        this.faceID = faceID;
        this.halfedgeTangent = halfedgeTangent;
        this.runTransform = runTransform;
        this.runFlags = runFlags;
        this.tolerance = tolerance;
      }
      get numTri() {
        return this.triVerts.length / 3;
      }
      get numVert() {
        return this.vertProperties.length / this.numProp;
      }
      get numRun() {
        return this.runOriginalID.length;
      }
      merge() {
        const { changed, mesh } = Module2._Merge(this);
        Object.assign(this, { ...mesh });
        return changed;
      }
      verts(tri) {
        return this.triVerts.subarray(3 * tri, 3 * (tri + 1));
      }
      position(vert) {
        return this.vertProperties.subarray(this.numProp * vert, this.numProp * vert + 3);
      }
      extras(vert) {
        return this.vertProperties.subarray(this.numProp * vert + 3, this.numProp * (vert + 1));
      }
      tangent(halfedge) {
        return this.halfedgeTangent.subarray(4 * halfedge, 4 * (halfedge + 1));
      }
      transform(run2) {
        const mat4 = new Array(16);
        for (const col of [0, 1, 2, 3]) {
          for (const row of [0, 1, 2]) {
            mat4[4 * col + row] = this.runTransform[12 * run2 + 3 * col + row];
          }
        }
        mat4[15] = 1;
        return mat4;
      }
      backside(run2) {
        return this.runFlags != null && run2 < this.runFlags.length && (this.runFlags[run2] & 1) !== 0;
      }
      hasNormals(run2) {
        return this.runFlags != null && run2 < this.runFlags.length && (this.runFlags[run2] & 2) !== 0;
      }
    }
    Module2.Mesh = Mesh;
    Module2.Manifold.prototype.getMesh = function(normalIdx = -1) {
      return new Mesh(this._GetMeshJS(normalIdx));
    };
    Module2.ManifoldError = function ManifoldError(code, ...args) {
      let message = "Unknown error";
      switch (code) {
        case "NonFiniteVertex":
          message = "Non-finite vertex";
          break;
        case "NotManifold":
          message = "Not manifold";
          break;
        case "VertexOutOfBounds":
          message = "Vertex index out of bounds";
          break;
        case "PropertiesWrongLength":
          message = "Properties have wrong length";
          break;
        case "MissingPositionProperties":
          message = "Less than three properties";
          break;
        case "MergeVectorsDifferentLengths":
          message = "Merge vectors have different lengths";
          break;
        case "MergeIndexOutOfBounds":
          message = "Merge index out of bounds";
          break;
        case "TransformWrongLength":
          message = "Transform vector has wrong length";
          break;
        case "RunIndexWrongLength":
          message = "Run index vector has wrong length";
          break;
        case "FaceIDWrongLength":
          message = "Face ID vector has wrong length";
          break;
        case "InvalidConstruction":
          message = "Manifold constructed with invalid parameters";
          break;
        case "ResultTooLarge":
          message = "Result exceeds maximum size";
          break;
        case "InvalidTangents":
          message = "Invalid halfedge tangents";
          break;
      }
      const base = Error.apply(this, [message, ...args]);
      base.name = this.name = "ManifoldError";
      this.message = base.message;
      this.stack = base.stack;
      this.code = code;
    };
    Module2.ManifoldError.prototype = Object.create(Error.prototype, { constructor: { value: Module2.ManifoldError, writable: true, configurable: true } });
    Module2.CrossSection = function(polygons, fillRule = "Positive") {
      const polygonsVec = polygons2vec(polygons);
      const cs = new CrossSectionCtor(polygonsVec, fillRuleToInt(fillRule));
      disposePolygons(polygonsVec);
      return cs;
    };
    Module2.CrossSection.ofPolygons = function(polygons, fillRule = "Positive") {
      return new Module2.CrossSection(polygons, fillRule);
    };
    Module2.CrossSection.square = function(...args) {
      let size = void 0;
      if (args.length == 0) size = { x: 1, y: 1 };
      else if (typeof args[0] == "number") size = { x: args[0], y: args[0] };
      else size = vararg2vec2(args);
      const center = args[1] || false;
      return Module2._Square(size, center);
    };
    Module2.CrossSection.circle = function(radius, circularSegments = 0) {
      return Module2._Circle(radius, circularSegments);
    };
    function crossSectionBatchbool(name) {
      return function(...args) {
        if (args.length == 1) args = args[0];
        const v = new Module2.Vector_crossSection();
        for (const cs of args) v.push_back(cross2(cs));
        const result = Module2["_crossSection" + name](v);
        v.delete();
        return result;
      };
    }
    Module2.CrossSection.compose = crossSectionBatchbool("Compose");
    Module2.CrossSection.union = crossSectionBatchbool("UnionN");
    Module2.CrossSection.difference = crossSectionBatchbool("DifferenceN");
    Module2.CrossSection.intersection = crossSectionBatchbool("IntersectionN");
    function pushVec2(vec, ps) {
      toVec(vec, ps, (p) => {
        if (p instanceof Array) return { x: p[0], y: p[1] };
        return p;
      });
    }
    Module2.CrossSection.hull = function(...args) {
      if (args.length == 1) args = args[0];
      let pts = new Module2.Vector_vec2();
      for (const cs of args) {
        if (cs instanceof CrossSectionCtor) {
          Module2._crossSectionCollectVertices(pts, cs);
        } else if (cs instanceof Array && cs.length == 2 && typeof cs[0] == "number") {
          pts.push_back({ x: cs[0], y: cs[1] });
        } else if (cs.x) {
          pts.push_back(cs);
        } else {
          const wrap = cs[0].length == 2 && typeof cs[0][0] == "number" || cs[0].x;
          const polys = wrap ? [cs] : cs;
          for (const poly of polys) pushVec2(pts, poly);
        }
      }
      const result = Module2._crossSectionHullPoints(pts);
      pts.delete();
      return result;
    };
    Module2.CrossSection.prototype = Object.create(CrossSectionCtor.prototype);
    Object.defineProperty(Module2.CrossSection, Symbol.hasInstance, { get: () => (t) => t instanceof CrossSectionCtor });
    const ManifoldCtor = Module2.Manifold;
    Module2.Manifold = function(mesh) {
      const manifold = new ManifoldCtor(mesh);
      const status = manifold.status();
      if (status !== "NoError") {
        throw new Module2.ManifoldError(status);
      }
      return manifold;
    };
    Module2.Manifold.ofMesh = function(mesh) {
      return new Module2.Manifold(mesh);
    };
    Module2.Manifold.tetrahedron = function() {
      return Module2._Tetrahedron();
    };
    Module2.Manifold.cube = function(...args) {
      let size = void 0;
      if (args.length == 0) size = { x: 1, y: 1, z: 1 };
      else if (typeof args[0] == "number") size = { x: args[0], y: args[0], z: args[0] };
      else size = vararg2vec3(args);
      const center = args[1] || false;
      return Module2._Cube(size, center);
    };
    Module2.Manifold.cylinder = function(height, radiusLow, radiusHigh = -1, circularSegments = 0, center = false) {
      return Module2._Cylinder(height, radiusLow, radiusHigh, circularSegments, center);
    };
    Module2.Manifold.sphere = function(radius, circularSegments = 0) {
      return Module2._Sphere(radius, circularSegments);
    };
    Module2.Manifold.smooth = function(mesh, sharpenedEdges = []) {
      const sharp = new Module2.Vector_smoothness();
      toVec(sharp, sharpenedEdges);
      const result = Module2._Smooth(mesh, sharp);
      sharp.delete();
      return result;
    };
    Module2.Manifold.extrude = function(polygons, height, nDivisions = 0, twistDegrees = 0, scaleTop = [1, 1], center = false) {
      const cs = polygons instanceof CrossSectionCtor ? polygons : Module2.CrossSection(polygons, "Positive");
      return cs.extrude(height, nDivisions, twistDegrees, scaleTop, center);
    };
    Module2.Manifold.revolve = function(polygons, circularSegments = 0, revolveDegrees = 360) {
      const cs = polygons instanceof CrossSectionCtor ? polygons : Module2.CrossSection(polygons, "Positive");
      return cs.revolve(circularSegments, revolveDegrees);
    };
    Module2.Manifold.reserveIDs = function(n) {
      return Module2._ReserveIDs(n);
    };
    function manifoldBatchbool(name) {
      return function(...args) {
        if (args.length == 1) args = args[0];
        const v = new Module2.Vector_manifold();
        for (const m of args) v.push_back(m);
        const result = Module2["_manifold" + name + "N"](v);
        v.delete();
        return result;
      };
    }
    Module2.Manifold.union = manifoldBatchbool("Union");
    Module2.Manifold.compose = Module2.Manifold.union;
    Module2.Manifold.difference = manifoldBatchbool("Difference");
    Module2.Manifold.intersection = manifoldBatchbool("Intersection");
    Module2.Manifold.levelSet = function(sdf, bounds, edgeLength, level = 0, tolerance = -1) {
      const bounds2 = { min: { x: bounds.min[0], y: bounds.min[1], z: bounds.min[2] }, max: { x: bounds.max[0], y: bounds.max[1], z: bounds.max[2] } };
      const wasmFuncPtr = addFunction(function(vec3Ptr) {
        const x = getValue(vec3Ptr, "double");
        const y = getValue(vec3Ptr + 8, "double");
        const z = getValue(vec3Ptr + 16, "double");
        const vert = [x, y, z];
        return sdf(vert);
      }, "di");
      const out2 = Module2._LevelSet(wasmFuncPtr, bounds2, edgeLength, level, tolerance);
      removeFunction(wasmFuncPtr);
      return out2;
    };
    Module2.ExecutionContext.prototype.fromMesh = function(mesh) {
      return this._FromMesh(mesh);
    };
    Module2.ExecutionContext.prototype.smooth = function(mesh, sharpenedEdges = []) {
      const sharp = new Module2.Vector_smoothness();
      toVec(sharp, sharpenedEdges);
      const result = this._Smooth(mesh, sharp);
      sharp.delete();
      return result;
    };
    Module2.ExecutionContext.prototype.levelSet = function(sdf, bounds, edgeLength, level = 0, tolerance = -1) {
      const bounds2 = { min: { x: bounds.min[0], y: bounds.min[1], z: bounds.min[2] }, max: { x: bounds.max[0], y: bounds.max[1], z: bounds.max[2] } };
      const wasmFuncPtr = addFunction(function(vec3Ptr) {
        const x = getValue(vec3Ptr, "double");
        const y = getValue(vec3Ptr + 8, "double");
        const z = getValue(vec3Ptr + 16, "double");
        const vert = [x, y, z];
        return sdf(vert);
      }, "di");
      const out2 = this._LevelSet(wasmFuncPtr, bounds2, edgeLength, level, tolerance);
      removeFunction(wasmFuncPtr);
      return out2;
    };
    function pushVec3(vec, ps) {
      toVec(vec, ps, (p) => {
        if (p instanceof Array) return { x: p[0], y: p[1], z: p[2] };
        return p;
      });
    }
    Module2.Manifold.hull = function(...args) {
      if (args.length == 1) args = args[0];
      let pts = new Module2.Vector_vec3();
      for (const m of args) {
        if (m instanceof ManifoldCtor) {
          Module2._manifoldCollectVertices(pts, m);
        } else if (m instanceof Array && m.length == 3 && typeof m[0] == "number") {
          pts.push_back({ x: m[0], y: m[1], z: m[2] });
        } else if (m.x) {
          pts.push_back(m);
        } else {
          pushVec3(pts, m);
        }
      }
      const result = Module2._manifoldHullPoints(pts);
      pts.delete();
      return result;
    };
    Module2.Manifold.prototype = Object.create(ManifoldCtor.prototype);
    Object.defineProperty(Module2.Manifold, Symbol.hasInstance, { get: () => (t) => t instanceof ManifoldCtor });
    Module2.triangulate = function(polygons, epsilon = -1, allowConvex = true) {
      const polygonsVec = polygons2vec(polygons);
      const result = fromVec(Module2._Triangulate(polygonsVec, epsilon, allowConvex), (x) => [x[0], x[1], x[2]]);
      disposePolygons(polygonsVec);
      return result;
    };
  };
  var arguments_ = [];
  var thisProgram = "./this.program";
  var quit_ = (status, toThrow) => {
    throw toThrow;
  };
  var _scriptName = import.meta.url;
  var scriptDirectory = "";
  function locateFile2(path) {
    if (Module2["locateFile"]) {
      return Module2["locateFile"](path, scriptDirectory);
    }
    return scriptDirectory + path;
  }
  var readAsync, readBinary;
  if (ENVIRONMENT_IS_NODE) {
    var fs = require2("node:fs");
    if (_scriptName.startsWith("file:")) {
      scriptDirectory = require2("node:path").dirname(require2("node:url").fileURLToPath(_scriptName)) + "/";
    }
    readBinary = (filename) => {
      filename = isFileURI(filename) ? new URL(filename) : filename;
      var ret = fs.readFileSync(filename);
      return ret;
    };
    readAsync = async (filename, binary = true) => {
      filename = isFileURI(filename) ? new URL(filename) : filename;
      var ret = fs.readFileSync(filename, binary ? void 0 : "utf8");
      return ret;
    };
    if (process.argv.length > 1) {
      thisProgram = process.argv[1].replace(/\\/g, "/");
    }
    arguments_ = process.argv.slice(2);
    quit_ = (status, toThrow) => {
      process.exitCode = status;
      throw toThrow;
    };
  } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    try {
      scriptDirectory = new URL(".", _scriptName).href;
    } catch {
    }
    {
      if (ENVIRONMENT_IS_WORKER) {
        readBinary = (url) => {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", url, false);
          xhr.responseType = "arraybuffer";
          xhr.send(null);
          return new Uint8Array(xhr.response);
        };
      }
      readAsync = async (url) => {
        if (isFileURI(url)) {
          return new Promise((resolve, reject) => {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url, true);
            xhr.responseType = "arraybuffer";
            xhr.onload = () => {
              if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                resolve(xhr.response);
                return;
              }
              reject(xhr.status);
            };
            xhr.onerror = reject;
            xhr.send(null);
          });
        }
        var response = await fetch(url, { credentials: "same-origin" });
        if (response.ok) {
          return response.arrayBuffer();
        }
        throw new Error(response.status + " : " + response.url);
      };
    }
  } else {
  }
  var out = console.log.bind(console);
  var err = console.error.bind(console);
  var wasmBinary;
  var ABORT = false;
  var isFileURI = (filename) => filename.startsWith("file://");
  var readyPromiseResolve, readyPromiseReject;
  var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
  var HEAP64, HEAPU64;
  var runtimeInitialized = false;
  function updateMemoryViews() {
    var b = wasmMemory.buffer;
    HEAP8 = new Int8Array(b);
    HEAP16 = new Int16Array(b);
    HEAPU8 = new Uint8Array(b);
    HEAPU16 = new Uint16Array(b);
    HEAP32 = new Int32Array(b);
    HEAPU32 = new Uint32Array(b);
    HEAPF32 = new Float32Array(b);
    HEAPF64 = new Float64Array(b);
    HEAP64 = new BigInt64Array(b);
    HEAPU64 = new BigUint64Array(b);
  }
  function preRun() {
    if (Module2["preRun"]) {
      if (typeof Module2["preRun"] == "function") Module2["preRun"] = [Module2["preRun"]];
      while (Module2["preRun"].length) {
        addOnPreRun(Module2["preRun"].shift());
      }
    }
    callRuntimeCallbacks(onPreRuns);
  }
  function initRuntime() {
    runtimeInitialized = true;
    wasmExports["J"]();
  }
  function postRun() {
    if (Module2["postRun"]) {
      if (typeof Module2["postRun"] == "function") Module2["postRun"] = [Module2["postRun"]];
      while (Module2["postRun"].length) {
        addOnPostRun(Module2["postRun"].shift());
      }
    }
    callRuntimeCallbacks(onPostRuns);
  }
  function abort(what) {
    Module2["onAbort"]?.(what);
    what = "Aborted(" + what + ")";
    err(what);
    ABORT = true;
    what += ". Build with -sASSERTIONS for more info.";
    var e = new WebAssembly.RuntimeError(what);
    readyPromiseReject?.(e);
    throw e;
  }
  var wasmBinaryFile;
  function findWasmBinary() {
    if (Module2["locateFile"]) {
      return locateFile2("manifold.wasm");
    }
    return new URL("manifold.wasm", import.meta.url).href;
  }
  function getBinarySync(file) {
    if (file == wasmBinaryFile && wasmBinary) {
      return new Uint8Array(wasmBinary);
    }
    if (readBinary) {
      return readBinary(file);
    }
    throw "both async and sync fetching of the wasm failed";
  }
  async function getWasmBinary(binaryFile) {
    if (!wasmBinary) {
      try {
        var response = await readAsync(binaryFile);
        return new Uint8Array(response);
      } catch {
      }
    }
    return getBinarySync(binaryFile);
  }
  async function instantiateArrayBuffer(binaryFile, imports) {
    try {
      var binary = await getWasmBinary(binaryFile);
      var instance = await WebAssembly.instantiate(binary, imports);
      return instance;
    } catch (reason) {
      err(`failed to asynchronously prepare wasm: ${reason}`);
      abort(reason);
    }
  }
  async function instantiateAsync(binary, binaryFile, imports) {
    if (!binary && !isFileURI(binaryFile) && !ENVIRONMENT_IS_NODE) {
      try {
        var response = fetch(binaryFile, { credentials: "same-origin" });
        var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
        return instantiationResult;
      } catch (reason) {
        err(`wasm streaming compile failed: ${reason}`);
        err("falling back to ArrayBuffer instantiation");
      }
    }
    return instantiateArrayBuffer(binaryFile, imports);
  }
  function getWasmImports() {
    var imports = { a: wasmImports };
    return imports;
  }
  async function createWasm() {
    function receiveInstance(instance, module) {
      wasmExports = instance.exports;
      wasmExports = applySignatureConversions(wasmExports);
      assignWasmExports(wasmExports);
      updateMemoryViews();
      return wasmExports;
    }
    function receiveInstantiationResult(result2) {
      return receiveInstance(result2["instance"]);
    }
    var info = getWasmImports();
    if (Module2["instantiateWasm"]) {
      return new Promise((resolve, reject) => {
        Module2["instantiateWasm"](info, (inst, mod) => {
          resolve(receiveInstance(inst, mod));
        });
      });
    }
    wasmBinaryFile ??= findWasmBinary();
    var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info);
    var exports = receiveInstantiationResult(result);
    return exports;
  }
  class ExitStatus {
    name = "ExitStatus";
    constructor(status) {
      this.message = `Program terminated with exit(${status})`;
      this.status = status;
    }
  }
  var callRuntimeCallbacks = (callbacks) => {
    while (callbacks.length > 0) {
      callbacks.shift()(Module2);
    }
  };
  var onPostRuns = [];
  var addOnPostRun = (cb) => onPostRuns.push(cb);
  var onPreRuns = [];
  var addOnPreRun = (cb) => onPreRuns.push(cb);
  function getValue(ptr, type = "i8") {
    if (type.endsWith("*")) type = "*";
    switch (type) {
      case "i1":
        return HEAP8[ptr >>> 0];
      case "i8":
        return HEAP8[ptr >>> 0];
      case "i16":
        return HEAP16[ptr >>> 1 >>> 0];
      case "i32":
        return HEAP32[ptr >>> 2 >>> 0];
      case "i64":
        return HEAP64[ptr >>> 3 >>> 0];
      case "float":
        return HEAPF32[ptr >>> 2 >>> 0];
      case "double":
        return HEAPF64[ptr >>> 3 >>> 0];
      case "*":
        return HEAPU32[ptr >>> 2 >>> 0];
      default:
        abort(`invalid type for getValue: ${type}`);
    }
  }
  var noExitRuntime = true;
  function setValue(ptr, value, type = "i8") {
    if (type.endsWith("*")) type = "*";
    switch (type) {
      case "i1":
        HEAP8[ptr >>> 0] = value;
        break;
      case "i8":
        HEAP8[ptr >>> 0] = value;
        break;
      case "i16":
        HEAP16[ptr >>> 1 >>> 0] = value;
        break;
      case "i32":
        HEAP32[ptr >>> 2 >>> 0] = value;
        break;
      case "i64":
        HEAP64[ptr >>> 3 >>> 0] = BigInt(value);
        break;
      case "float":
        HEAPF32[ptr >>> 2 >>> 0] = value;
        break;
      case "double":
        HEAPF64[ptr >>> 3 >>> 0] = value;
        break;
      case "*":
        HEAPU32[ptr >>> 2 >>> 0] = value;
        break;
      default:
        abort(`invalid type for setValue: ${type}`);
    }
  }
  class ExceptionInfo {
    constructor(excPtr) {
      this.excPtr = excPtr;
      this.ptr = excPtr - 24;
    }
    set_type(type) {
      HEAPU32[this.ptr + 4 >>> 2 >>> 0] = type;
    }
    get_type() {
      return HEAPU32[this.ptr + 4 >>> 2 >>> 0];
    }
    set_destructor(destructor) {
      HEAPU32[this.ptr + 8 >>> 2 >>> 0] = destructor;
    }
    get_destructor() {
      return HEAPU32[this.ptr + 8 >>> 2 >>> 0];
    }
    set_caught(caught) {
      caught = caught ? 1 : 0;
      HEAP8[this.ptr + 12 >>> 0] = caught;
    }
    get_caught() {
      return HEAP8[this.ptr + 12 >>> 0] != 0;
    }
    set_rethrown(rethrown) {
      rethrown = rethrown ? 1 : 0;
      HEAP8[this.ptr + 13 >>> 0] = rethrown;
    }
    get_rethrown() {
      return HEAP8[this.ptr + 13 >>> 0] != 0;
    }
    init(type, destructor) {
      this.set_adjusted_ptr(0);
      this.set_type(type);
      this.set_destructor(destructor);
    }
    set_adjusted_ptr(adjustedPtr) {
      HEAPU32[this.ptr + 16 >>> 2 >>> 0] = adjustedPtr;
    }
    get_adjusted_ptr() {
      return HEAPU32[this.ptr + 16 >>> 2 >>> 0];
    }
  }
  var exceptionLast = 0;
  var uncaughtExceptionCount = 0;
  function ___cxa_throw(ptr, type, destructor) {
    ptr >>>= 0;
    type >>>= 0;
    destructor >>>= 0;
    var info = new ExceptionInfo(ptr);
    info.init(type, destructor);
    exceptionLast = ptr;
    uncaughtExceptionCount++;
    throw exceptionLast;
  }
  var __abort_js = () => abort("");
  var structRegistrations = {};
  var runDestructors = (destructors) => {
    while (destructors.length) {
      var ptr = destructors.pop();
      var del = destructors.pop();
      del(ptr);
    }
  };
  function readPointer(pointer) {
    return this.fromWireType(HEAPU32[pointer >>> 2 >>> 0]);
  }
  var awaitingDependencies = {};
  var registeredTypes = {};
  var typeDependencies = {};
  var InternalError = class InternalError extends Error {
    constructor(message) {
      super(message);
      this.name = "InternalError";
    }
  };
  var throwInternalError = (message) => {
    throw new InternalError(message);
  };
  var whenDependentTypesAreResolved = (myTypes, dependentTypes, getTypeConverters) => {
    myTypes.forEach((type) => typeDependencies[type] = dependentTypes);
    function onComplete(typeConverters2) {
      var myTypeConverters = getTypeConverters(typeConverters2);
      if (myTypeConverters.length !== myTypes.length) {
        throwInternalError("Mismatched type converter count");
      }
      for (var i = 0; i < myTypes.length; ++i) {
        registerType(myTypes[i], myTypeConverters[i]);
      }
    }
    var typeConverters = new Array(dependentTypes.length);
    var unregisteredTypes = [];
    var registered = 0;
    for (let [i, dt] of dependentTypes.entries()) {
      if (registeredTypes.hasOwnProperty(dt)) {
        typeConverters[i] = registeredTypes[dt];
      } else {
        unregisteredTypes.push(dt);
        if (!awaitingDependencies.hasOwnProperty(dt)) {
          awaitingDependencies[dt] = [];
        }
        awaitingDependencies[dt].push(() => {
          typeConverters[i] = registeredTypes[dt];
          ++registered;
          if (registered === unregisteredTypes.length) {
            onComplete(typeConverters);
          }
        });
      }
    }
    if (0 === unregisteredTypes.length) {
      onComplete(typeConverters);
    }
  };
  var __embind_finalize_value_object = function(structType) {
    structType >>>= 0;
    var reg = structRegistrations[structType];
    delete structRegistrations[structType];
    var rawConstructor = reg.rawConstructor;
    var rawDestructor = reg.rawDestructor;
    var fieldRecords = reg.fields;
    var fieldTypes = fieldRecords.map((field) => field.getterReturnType).concat(fieldRecords.map((field) => field.setterArgumentType));
    whenDependentTypesAreResolved([structType], fieldTypes, (fieldTypes2) => {
      var fields = {};
      for (var [i, field] of fieldRecords.entries()) {
        const getterReturnType = fieldTypes2[i];
        const getter = field.getter;
        const getterContext = field.getterContext;
        const setterArgumentType = fieldTypes2[i + fieldRecords.length];
        const setter = field.setter;
        const setterContext = field.setterContext;
        fields[field.fieldName] = { read: (ptr) => getterReturnType.fromWireType(getter(getterContext, ptr)), write: (ptr, o) => {
          var destructors = [];
          setter(setterContext, ptr, setterArgumentType.toWireType(destructors, o));
          runDestructors(destructors);
        }, optional: getterReturnType.optional };
      }
      return [{ name: reg.name, fromWireType: (ptr) => {
        var rv = {};
        for (var i2 in fields) {
          rv[i2] = fields[i2].read(ptr);
        }
        rawDestructor(ptr);
        return rv;
      }, toWireType: (destructors, o) => {
        for (var fieldName in fields) {
          if (!(fieldName in o) && !fields[fieldName].optional) {
            throw new TypeError(`Missing field: "${fieldName}"`);
          }
        }
        var ptr = rawConstructor();
        for (fieldName in fields) {
          fields[fieldName].write(ptr, o[fieldName]);
        }
        if (destructors !== null) {
          destructors.push(rawDestructor, ptr);
        }
        return ptr;
      }, readValueFromPointer: readPointer, destructorFunction: rawDestructor }];
    });
  };
  var AsciiToString = (ptr) => {
    ptr >>>= 0;
    var str = "";
    while (1) {
      var ch = HEAPU8[ptr++ >>> 0];
      if (!ch) return str;
      str += String.fromCharCode(ch);
    }
  };
  var BindingError = class BindingError extends Error {
    constructor(message) {
      super(message);
      this.name = "BindingError";
    }
  };
  var throwBindingError = (message) => {
    throw new BindingError(message);
  };
  function sharedRegisterType(rawType, registeredInstance, options = {}) {
    var name = registeredInstance.name;
    if (!rawType) {
      throwBindingError(`type "${name}" must have a positive integer typeid pointer`);
    }
    if (registeredTypes.hasOwnProperty(rawType)) {
      if (options.ignoreDuplicateRegistrations) {
        return;
      } else {
        throwBindingError(`Cannot register type '${name}' twice`);
      }
    }
    registeredTypes[rawType] = registeredInstance;
    delete typeDependencies[rawType];
    if (awaitingDependencies.hasOwnProperty(rawType)) {
      var callbacks = awaitingDependencies[rawType];
      delete awaitingDependencies[rawType];
      callbacks.forEach((cb) => cb());
    }
  }
  function registerType(rawType, registeredInstance, options = {}) {
    return sharedRegisterType(rawType, registeredInstance, options);
  }
  var integerReadValueFromPointer = (name, width, signed) => {
    switch (width) {
      case 1:
        return signed ? (pointer) => HEAP8[pointer >>> 0] : (pointer) => HEAPU8[pointer >>> 0];
      case 2:
        return signed ? (pointer) => HEAP16[pointer >>> 1 >>> 0] : (pointer) => HEAPU16[pointer >>> 1 >>> 0];
      case 4:
        return signed ? (pointer) => HEAP32[pointer >>> 2 >>> 0] : (pointer) => HEAPU32[pointer >>> 2 >>> 0];
      case 8:
        return signed ? (pointer) => HEAP64[pointer >>> 3 >>> 0] : (pointer) => HEAPU64[pointer >>> 3 >>> 0];
      default:
        throw new TypeError(`invalid integer width (${width}): ${name}`);
    }
  };
  var __embind_register_bigint = function(primitiveType, name, size, minRange, maxRange) {
    primitiveType >>>= 0;
    name >>>= 0;
    size >>>= 0;
    name = AsciiToString(name);
    const isUnsignedType = minRange === 0n;
    let fromWireType = (value) => value;
    if (isUnsignedType) {
      const bitSize = size * 8;
      fromWireType = (value) => BigInt.asUintN(bitSize, value);
      maxRange = fromWireType(maxRange);
    }
    registerType(primitiveType, { name, fromWireType, toWireType: (destructors, value) => {
      if (typeof value == "number") {
        value = BigInt(value);
      }
      return value;
    }, readValueFromPointer: integerReadValueFromPointer(name, size, !isUnsignedType), destructorFunction: null });
  };
  function __embind_register_bool(rawType, name, trueValue, falseValue) {
    rawType >>>= 0;
    name >>>= 0;
    name = AsciiToString(name);
    registerType(rawType, { name, fromWireType: function(wt) {
      return !!wt;
    }, toWireType: function(destructors, o) {
      return o ? trueValue : falseValue;
    }, readValueFromPointer: function(pointer) {
      return this.fromWireType(HEAPU8[pointer >>> 0]);
    }, destructorFunction: null });
  }
  var shallowCopyInternalPointer = (o) => ({ count: o.count, deleteScheduled: o.deleteScheduled, preservePointerOnDelete: o.preservePointerOnDelete, ptr: o.ptr, ptrType: o.ptrType, smartPtr: o.smartPtr, smartPtrType: o.smartPtrType });
  var throwInstanceAlreadyDeleted = (obj) => {
    function getInstanceTypeName(handle) {
      return handle.$$.ptrType.registeredClass.name;
    }
    throwBindingError(getInstanceTypeName(obj) + " instance already deleted");
  };
  var finalizationRegistry = false;
  var detachFinalizer = (handle) => {
  };
  var runDestructor = ($$) => {
    if ($$.smartPtr) {
      $$.smartPtrType.rawDestructor($$.smartPtr);
    } else {
      $$.ptrType.registeredClass.rawDestructor($$.ptr);
    }
  };
  var releaseClassHandle = ($$) => {
    $$.count.value -= 1;
    var toDelete = 0 === $$.count.value;
    if (toDelete) {
      runDestructor($$);
    }
  };
  var attachFinalizer = (handle) => {
    if (!globalThis.FinalizationRegistry) {
      attachFinalizer = (handle2) => handle2;
      return handle;
    }
    finalizationRegistry = new FinalizationRegistry((info) => {
      releaseClassHandle(info.$$);
    });
    attachFinalizer = (handle2) => {
      var $$ = handle2.$$;
      var hasSmartPtr = !!$$.smartPtr;
      if (hasSmartPtr) {
        var info = { $$ };
        finalizationRegistry.register(handle2, info, handle2);
      }
      return handle2;
    };
    detachFinalizer = (handle2) => finalizationRegistry.unregister(handle2);
    return attachFinalizer(handle);
  };
  var deletionQueue = [];
  var flushPendingDeletes = () => {
    while (deletionQueue.length) {
      var obj = deletionQueue.pop();
      obj.$$.deleteScheduled = false;
      obj["delete"]();
    }
  };
  var delayFunction;
  var init_ClassHandle = () => {
    let proto = ClassHandle.prototype;
    Object.assign(proto, { isAliasOf(other) {
      if (!(this instanceof ClassHandle)) {
        return false;
      }
      if (!(other instanceof ClassHandle)) {
        return false;
      }
      var leftClass = this.$$.ptrType.registeredClass;
      var left = this.$$.ptr;
      other.$$ = other.$$;
      var rightClass = other.$$.ptrType.registeredClass;
      var right = other.$$.ptr;
      while (leftClass.baseClass) {
        left = leftClass.upcast(left);
        leftClass = leftClass.baseClass;
      }
      while (rightClass.baseClass) {
        right = rightClass.upcast(right);
        rightClass = rightClass.baseClass;
      }
      return leftClass === rightClass && left === right;
    }, clone() {
      if (!this.$$.ptr) {
        throwInstanceAlreadyDeleted(this);
      }
      if (this.$$.preservePointerOnDelete) {
        this.$$.count.value += 1;
        return this;
      } else {
        var clone = attachFinalizer(Object.create(Object.getPrototypeOf(this), { $$: { value: shallowCopyInternalPointer(this.$$) } }));
        clone.$$.count.value += 1;
        clone.$$.deleteScheduled = false;
        return clone;
      }
    }, delete() {
      if (!this.$$.ptr) {
        throwInstanceAlreadyDeleted(this);
      }
      if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
        throwBindingError("Object already scheduled for deletion");
      }
      detachFinalizer(this);
      releaseClassHandle(this.$$);
      if (!this.$$.preservePointerOnDelete) {
        this.$$.smartPtr = void 0;
        this.$$.ptr = void 0;
      }
    }, isDeleted() {
      return !this.$$.ptr;
    }, deleteLater() {
      if (!this.$$.ptr) {
        throwInstanceAlreadyDeleted(this);
      }
      if (this.$$.deleteScheduled && !this.$$.preservePointerOnDelete) {
        throwBindingError("Object already scheduled for deletion");
      }
      deletionQueue.push(this);
      if (deletionQueue.length === 1 && delayFunction) {
        delayFunction(flushPendingDeletes);
      }
      this.$$.deleteScheduled = true;
      return this;
    } });
    const symbolDispose = Symbol.dispose;
    if (symbolDispose) {
      proto[symbolDispose] = proto["delete"];
    }
  };
  function ClassHandle() {
  }
  var createNamedFunction = (name, func) => Object.defineProperty(func, "name", { value: name });
  var registeredPointers = {};
  var ensureOverloadTable = (proto, methodName, humanName) => {
    if (void 0 === proto[methodName].overloadTable) {
      var prevFunc = proto[methodName];
      proto[methodName] = function(...args) {
        if (!proto[methodName].overloadTable.hasOwnProperty(args.length)) {
          throwBindingError(`Function '${humanName}' called with an invalid number of arguments (${args.length}) - expects one of (${proto[methodName].overloadTable})!`);
        }
        return proto[methodName].overloadTable[args.length].apply(this, args);
      };
      proto[methodName].overloadTable = [];
      proto[methodName].overloadTable[prevFunc.argCount] = prevFunc;
    }
  };
  var exposePublicSymbol = (name, value, numArguments) => {
    if (Module2.hasOwnProperty(name)) {
      if (void 0 === numArguments || void 0 !== Module2[name].overloadTable && void 0 !== Module2[name].overloadTable[numArguments]) {
        throwBindingError(`Cannot register public name '${name}' twice`);
      }
      ensureOverloadTable(Module2, name, name);
      if (Module2[name].overloadTable.hasOwnProperty(numArguments)) {
        throwBindingError(`Cannot register multiple overloads of a function with the same number of arguments (${numArguments})!`);
      }
      Module2[name].overloadTable[numArguments] = value;
    } else {
      Module2[name] = value;
      Module2[name].argCount = numArguments;
    }
  };
  var char_0 = 48;
  var char_9 = 57;
  var makeLegalFunctionName = (name) => {
    name = name.replace(/[^a-zA-Z0-9_]/g, "$");
    var f = name.charCodeAt(0);
    if (f >= char_0 && f <= char_9) {
      return `_${name}`;
    }
    return name;
  };
  function RegisteredClass(name, constructor, instancePrototype, rawDestructor, baseClass, getActualType, upcast, downcast) {
    this.name = name;
    this.constructor = constructor;
    this.instancePrototype = instancePrototype;
    this.rawDestructor = rawDestructor;
    this.baseClass = baseClass;
    this.getActualType = getActualType;
    this.upcast = upcast;
    this.downcast = downcast;
    this.pureVirtualFunctions = [];
  }
  var upcastPointer = (ptr, ptrClass, desiredClass) => {
    while (ptrClass !== desiredClass) {
      if (!ptrClass.upcast) {
        throwBindingError(`Expected null or instance of ${desiredClass.name}, got an instance of ${ptrClass.name}`);
      }
      ptr = ptrClass.upcast(ptr);
      ptrClass = ptrClass.baseClass;
    }
    return ptr;
  };
  var embindRepr = (v) => {
    if (v === null) {
      return "null";
    }
    var t = typeof v;
    if (t === "object" || t === "array" || t === "function") {
      return v.toString();
    } else {
      return "" + v;
    }
  };
  function constNoSmartPtrRawPointerToWireType(destructors, handle) {
    if (handle === null) {
      if (this.isReference) {
        throwBindingError(`null is not a valid ${this.name}`);
      }
      return 0;
    }
    if (!handle.$$) {
      throwBindingError(`Cannot pass "${embindRepr(handle)}" as a ${this.name}`);
    }
    if (!handle.$$.ptr) {
      throwBindingError(`Cannot pass deleted object as a pointer of type ${this.name}`);
    }
    var handleClass = handle.$$.ptrType.registeredClass;
    var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
    return ptr;
  }
  function genericPointerToWireType(destructors, handle) {
    var ptr;
    if (handle === null) {
      if (this.isReference) {
        throwBindingError(`null is not a valid ${this.name}`);
      }
      if (this.isSmartPointer) {
        ptr = this.rawConstructor();
        if (destructors !== null) {
          destructors.push(this.rawDestructor, ptr);
        }
        return ptr;
      } else {
        return 0;
      }
    }
    if (!handle || !handle.$$) {
      throwBindingError(`Cannot pass "${embindRepr(handle)}" as a ${this.name}`);
    }
    if (!handle.$$.ptr) {
      throwBindingError(`Cannot pass deleted object as a pointer of type ${this.name}`);
    }
    if (!this.isConst && handle.$$.ptrType.isConst) {
      throwBindingError(`Cannot convert argument of type ${handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name} to parameter type ${this.name}`);
    }
    var handleClass = handle.$$.ptrType.registeredClass;
    ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
    if (this.isSmartPointer) {
      if (void 0 === handle.$$.smartPtr) {
        throwBindingError("Passing raw pointer to smart pointer is illegal");
      }
      switch (this.sharingPolicy) {
        case 0:
          if (handle.$$.smartPtrType === this) {
            ptr = handle.$$.smartPtr;
          } else {
            throwBindingError(`Cannot convert argument of type ${handle.$$.smartPtrType ? handle.$$.smartPtrType.name : handle.$$.ptrType.name} to parameter type ${this.name}`);
          }
          break;
        case 1:
          ptr = handle.$$.smartPtr;
          break;
        case 2:
          if (handle.$$.smartPtrType === this) {
            ptr = handle.$$.smartPtr;
          } else {
            var clonedHandle = handle["clone"]();
            ptr = this.rawShare(ptr, Emval.toHandle(() => clonedHandle["delete"]()));
            if (destructors !== null) {
              destructors.push(this.rawDestructor, ptr);
            }
          }
          break;
        default:
          throwBindingError("Unsupported sharing policy");
      }
    }
    return ptr;
  }
  function nonConstNoSmartPtrRawPointerToWireType(destructors, handle) {
    if (handle === null) {
      if (this.isReference) {
        throwBindingError(`null is not a valid ${this.name}`);
      }
      return 0;
    }
    if (!handle.$$) {
      throwBindingError(`Cannot pass "${embindRepr(handle)}" as a ${this.name}`);
    }
    if (!handle.$$.ptr) {
      throwBindingError(`Cannot pass deleted object as a pointer of type ${this.name}`);
    }
    if (handle.$$.ptrType.isConst) {
      throwBindingError(`Cannot convert argument of type ${handle.$$.ptrType.name} to parameter type ${this.name}`);
    }
    var handleClass = handle.$$.ptrType.registeredClass;
    var ptr = upcastPointer(handle.$$.ptr, handleClass, this.registeredClass);
    return ptr;
  }
  var downcastPointer = (ptr, ptrClass, desiredClass) => {
    if (ptrClass === desiredClass) {
      return ptr;
    }
    if (void 0 === desiredClass.baseClass) {
      return null;
    }
    var rv = downcastPointer(ptr, ptrClass, desiredClass.baseClass);
    if (rv === null) {
      return null;
    }
    return desiredClass.downcast(rv);
  };
  var registeredInstances = {};
  var getBasestPointer = (class_, ptr) => {
    if (ptr === void 0) {
      throwBindingError("ptr should not be undefined");
    }
    while (class_.baseClass) {
      ptr = class_.upcast(ptr);
      class_ = class_.baseClass;
    }
    return ptr;
  };
  var getInheritedInstance = (class_, ptr) => {
    ptr = getBasestPointer(class_, ptr);
    return registeredInstances[ptr];
  };
  var makeClassHandle = (prototype, record) => {
    if (!record.ptrType || !record.ptr) {
      throwInternalError("makeClassHandle requires ptr and ptrType");
    }
    var hasSmartPtrType = !!record.smartPtrType;
    var hasSmartPtr = !!record.smartPtr;
    if (hasSmartPtrType !== hasSmartPtr) {
      throwInternalError("Both smartPtrType and smartPtr must be specified");
    }
    record.count = { value: 1 };
    return attachFinalizer(Object.create(prototype, { $$: { value: record, writable: true } }));
  };
  function RegisteredPointer_fromWireType(ptr) {
    var rawPointer = this.getPointee(ptr);
    if (!rawPointer) {
      this.destructor(ptr);
      return null;
    }
    var registeredInstance = getInheritedInstance(this.registeredClass, rawPointer);
    if (void 0 !== registeredInstance) {
      if (0 === registeredInstance.$$.count.value) {
        registeredInstance.$$.ptr = rawPointer;
        registeredInstance.$$.smartPtr = ptr;
        return registeredInstance["clone"]();
      } else {
        var rv = registeredInstance["clone"]();
        this.destructor(ptr);
        return rv;
      }
    }
    function makeDefaultHandle() {
      if (this.isSmartPointer) {
        return makeClassHandle(this.registeredClass.instancePrototype, { ptrType: this.pointeeType, ptr: rawPointer, smartPtrType: this, smartPtr: ptr });
      } else {
        return makeClassHandle(this.registeredClass.instancePrototype, { ptrType: this, ptr });
      }
    }
    var actualType = this.registeredClass.getActualType(rawPointer);
    var registeredPointerRecord = registeredPointers[actualType];
    if (!registeredPointerRecord) {
      return makeDefaultHandle.call(this);
    }
    var toType;
    if (this.isConst) {
      toType = registeredPointerRecord.constPointerType;
    } else {
      toType = registeredPointerRecord.pointerType;
    }
    var dp = downcastPointer(rawPointer, this.registeredClass, toType.registeredClass);
    if (dp === null) {
      return makeDefaultHandle.call(this);
    }
    if (this.isSmartPointer) {
      return makeClassHandle(toType.registeredClass.instancePrototype, { ptrType: toType, ptr: dp, smartPtrType: this, smartPtr: ptr });
    } else {
      return makeClassHandle(toType.registeredClass.instancePrototype, { ptrType: toType, ptr: dp });
    }
  }
  var init_RegisteredPointer = () => {
    Object.assign(RegisteredPointer.prototype, { getPointee(ptr) {
      if (this.rawGetPointee) {
        ptr = this.rawGetPointee(ptr);
      }
      return ptr;
    }, destructor(ptr) {
      this.rawDestructor?.(ptr);
    }, readValueFromPointer: readPointer, fromWireType: RegisteredPointer_fromWireType });
  };
  function RegisteredPointer(name, registeredClass, isReference, isConst, isSmartPointer, pointeeType, sharingPolicy, rawGetPointee, rawConstructor, rawShare, rawDestructor) {
    this.name = name;
    this.registeredClass = registeredClass;
    this.isReference = isReference;
    this.isConst = isConst;
    this.isSmartPointer = isSmartPointer;
    this.pointeeType = pointeeType;
    this.sharingPolicy = sharingPolicy;
    this.rawGetPointee = rawGetPointee;
    this.rawConstructor = rawConstructor;
    this.rawShare = rawShare;
    this.rawDestructor = rawDestructor;
    if (!isSmartPointer && registeredClass.baseClass === void 0) {
      if (isConst) {
        this.toWireType = constNoSmartPtrRawPointerToWireType;
        this.destructorFunction = null;
      } else {
        this.toWireType = nonConstNoSmartPtrRawPointerToWireType;
        this.destructorFunction = null;
      }
    } else {
      this.toWireType = genericPointerToWireType;
    }
  }
  var replacePublicSymbol = (name, value, numArguments) => {
    if (!Module2.hasOwnProperty(name)) {
      throwInternalError("Replacing nonexistent public symbol");
    }
    if (void 0 !== Module2[name].overloadTable && void 0 !== numArguments) {
      Module2[name].overloadTable[numArguments] = value;
    } else {
      Module2[name] = value;
      Module2[name].argCount = numArguments;
    }
  };
  var getWasmTableEntry = (funcPtr) => wasmTable.get(funcPtr);
  var dynCall = (sig, ptr, args = [], promising = false) => {
    var func = getWasmTableEntry(ptr);
    var rtn = func(...args);
    function convert(rtn2) {
      return sig[0] == "p" ? rtn2 >>> 0 : rtn2;
    }
    return convert(rtn);
  };
  var getDynCaller = (sig, ptr, promising = false) => (...args) => dynCall(sig, ptr, args, promising);
  var embind__requireFunction = (signature, rawFunction, isAsync = false) => {
    signature = AsciiToString(signature);
    function makeDynCaller() {
      if (signature.includes("p")) {
        return getDynCaller(signature, rawFunction, isAsync);
      }
      var rtn = getWasmTableEntry(rawFunction);
      return rtn;
    }
    var fp = makeDynCaller();
    if (typeof fp != "function") {
      throwBindingError(`unknown function pointer with signature ${signature}: ${rawFunction}`);
    }
    return fp;
  };
  class UnboundTypeError extends Error {
  }
  var getTypeName = (type) => {
    var ptr = ___getTypeName(type);
    var rv = AsciiToString(ptr);
    _free(ptr);
    return rv;
  };
  var throwUnboundTypeError = (message, types) => {
    var unboundTypes = [];
    var seen = {};
    function visit(type) {
      if (seen[type]) {
        return;
      }
      if (registeredTypes[type]) {
        return;
      }
      if (typeDependencies[type]) {
        typeDependencies[type].forEach(visit);
        return;
      }
      unboundTypes.push(type);
      seen[type] = true;
    }
    types.forEach(visit);
    throw new UnboundTypeError(`${message}: ` + unboundTypes.map(getTypeName).join([", "]));
  };
  function __embind_register_class(rawType, rawPointerType, rawConstPointerType, baseClassRawType, getActualTypeSignature, getActualType, upcastSignature, upcast, downcastSignature, downcast, name, destructorSignature, rawDestructor) {
    rawType >>>= 0;
    rawPointerType >>>= 0;
    rawConstPointerType >>>= 0;
    baseClassRawType >>>= 0;
    getActualTypeSignature >>>= 0;
    getActualType >>>= 0;
    upcastSignature >>>= 0;
    upcast >>>= 0;
    downcastSignature >>>= 0;
    downcast >>>= 0;
    name >>>= 0;
    destructorSignature >>>= 0;
    rawDestructor >>>= 0;
    name = AsciiToString(name);
    getActualType = embind__requireFunction(getActualTypeSignature, getActualType);
    upcast &&= embind__requireFunction(upcastSignature, upcast);
    downcast &&= embind__requireFunction(downcastSignature, downcast);
    rawDestructor = embind__requireFunction(destructorSignature, rawDestructor);
    var legalFunctionName = makeLegalFunctionName(name);
    exposePublicSymbol(legalFunctionName, function() {
      throwUnboundTypeError(`Cannot construct ${name} due to unbound types`, [baseClassRawType]);
    });
    whenDependentTypesAreResolved([rawType, rawPointerType, rawConstPointerType], baseClassRawType ? [baseClassRawType] : [], (base) => {
      base = base[0];
      var baseClass;
      var basePrototype;
      if (baseClassRawType) {
        baseClass = base.registeredClass;
        basePrototype = baseClass.instancePrototype;
      } else {
        basePrototype = ClassHandle.prototype;
      }
      var constructor = createNamedFunction(name, function(...args) {
        if (Object.getPrototypeOf(this) !== instancePrototype) {
          throw new BindingError(`Use 'new' to construct ${name}`);
        }
        if (void 0 === registeredClass.constructor_body) {
          throw new BindingError(`${name} has no accessible constructor`);
        }
        var body = registeredClass.constructor_body[args.length];
        if (void 0 === body) {
          throw new BindingError(`Tried to invoke ctor of ${name} with invalid number of parameters (${args.length}) - expected (${Object.keys(registeredClass.constructor_body).toString()}) parameters instead!`);
        }
        return body.apply(this, args);
      });
      var instancePrototype = Object.create(basePrototype, { constructor: { value: constructor } });
      constructor.prototype = instancePrototype;
      var registeredClass = new RegisteredClass(name, constructor, instancePrototype, rawDestructor, baseClass, getActualType, upcast, downcast);
      if (registeredClass.baseClass) {
        registeredClass.baseClass.__derivedClasses ??= [];
        registeredClass.baseClass.__derivedClasses.push(registeredClass);
      }
      var referenceConverter = new RegisteredPointer(name, registeredClass, true, false, false);
      var pointerConverter = new RegisteredPointer(name + "*", registeredClass, false, false, false);
      var constPointerConverter = new RegisteredPointer(name + " const*", registeredClass, false, true, false);
      registeredPointers[rawType] = { pointerType: pointerConverter, constPointerType: constPointerConverter };
      replacePublicSymbol(legalFunctionName, constructor);
      return [referenceConverter, pointerConverter, constPointerConverter];
    });
  }
  var heap32VectorToArray = (count, firstElement) => {
    var array = [];
    for (var i = 0; i < count; i++) {
      array.push(HEAPU32[firstElement + i * 4 >>> 2 >>> 0]);
    }
    return array;
  };
  function usesDestructorStack(argTypes) {
    for (var i = 1; i < argTypes.length; ++i) {
      if (argTypes[i] !== null && argTypes[i].destructorFunction === void 0) {
        return true;
      }
    }
    return false;
  }
  function createJsInvoker(argTypes, isClassMethodFunc, returns, isAsync) {
    var needsDestructorStack = usesDestructorStack(argTypes);
    var argCount = argTypes.length - 2;
    var argsList = [];
    var argsListWired = ["fn"];
    if (isClassMethodFunc) {
      argsListWired.push("thisWired");
    }
    for (var i = 0; i < argCount; ++i) {
      argsList.push(`arg${i}`);
      argsListWired.push(`arg${i}Wired`);
    }
    argsList = argsList.join(",");
    argsListWired = argsListWired.join(",");
    var invokerFnBody = `return function (${argsList}) {
`;
    if (needsDestructorStack) {
      invokerFnBody += "var destructors = [];\n";
    }
    var dtorStack = needsDestructorStack ? "destructors" : "null";
    var args1 = ["humanName", "throwBindingError", "invoker", "fn", "runDestructors", "fromRetWire", "toClassParamWire"];
    if (isClassMethodFunc) {
      invokerFnBody += `var thisWired = toClassParamWire(${dtorStack}, this);
`;
    }
    for (var i = 0; i < argCount; ++i) {
      var argName = `toArg${i}Wire`;
      invokerFnBody += `var arg${i}Wired = ${argName}(${dtorStack}, arg${i});
`;
      args1.push(argName);
    }
    invokerFnBody += (returns || isAsync ? "var rv = " : "") + `invoker(${argsListWired});
`;
    if (needsDestructorStack) {
      invokerFnBody += "runDestructors(destructors);\n";
    } else {
      for (var i = isClassMethodFunc ? 1 : 2; i < argTypes.length; ++i) {
        var paramName = i === 1 ? "thisWired" : "arg" + (i - 2) + "Wired";
        if (argTypes[i].destructorFunction !== null) {
          invokerFnBody += `${paramName}_dtor(${paramName});
`;
          args1.push(`${paramName}_dtor`);
        }
      }
    }
    if (returns) {
      invokerFnBody += "var ret = fromRetWire(rv);\nreturn ret;\n";
    } else {
    }
    invokerFnBody += "}\n";
    return new Function(args1, invokerFnBody);
  }
  function craftInvokerFunction(humanName, argTypes, classType, cppInvokerFunc, cppTargetFunc, isAsync) {
    var argCount = argTypes.length;
    if (argCount < 2) {
      throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!");
    }
    var isClassMethodFunc = argTypes[1] !== null && classType !== null;
    var needsDestructorStack = usesDestructorStack(argTypes);
    var returns = !argTypes[0].isVoid;
    var retType = argTypes[0];
    var instType = argTypes[1];
    var closureArgs = [humanName, throwBindingError, cppInvokerFunc, cppTargetFunc, runDestructors, retType.fromWireType.bind(retType), instType?.toWireType.bind(instType)];
    for (var i = 2; i < argCount; ++i) {
      var argType = argTypes[i];
      closureArgs.push(argType.toWireType.bind(argType));
    }
    if (!needsDestructorStack) {
      for (var i = isClassMethodFunc ? 1 : 2; i < argTypes.length; ++i) {
        if (argTypes[i].destructorFunction !== null) {
          closureArgs.push(argTypes[i].destructorFunction);
        }
      }
    }
    let invokerFactory = createJsInvoker(argTypes, isClassMethodFunc, returns, isAsync);
    var invokerFn = invokerFactory(...closureArgs);
    return createNamedFunction(humanName, invokerFn);
  }
  var __embind_register_class_constructor = function(rawClassType, argCount, rawArgTypesAddr, invokerSignature, invoker, rawConstructor) {
    rawClassType >>>= 0;
    rawArgTypesAddr >>>= 0;
    invokerSignature >>>= 0;
    invoker >>>= 0;
    rawConstructor >>>= 0;
    var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
    invoker = embind__requireFunction(invokerSignature, invoker);
    whenDependentTypesAreResolved([], [rawClassType], (classType) => {
      classType = classType[0];
      var humanName = `constructor ${classType.name}`;
      if (void 0 === classType.registeredClass.constructor_body) {
        classType.registeredClass.constructor_body = [];
      }
      if (void 0 !== classType.registeredClass.constructor_body[argCount - 1]) {
        throw new BindingError(`Cannot register multiple constructors with identical number of parameters (${argCount - 1}) for class '${classType.name}'! Overload resolution is currently only performed using the parameter count, not actual type info!`);
      }
      classType.registeredClass.constructor_body[argCount - 1] = () => {
        throwUnboundTypeError(`Cannot construct ${classType.name} due to unbound types`, rawArgTypes);
      };
      whenDependentTypesAreResolved([], rawArgTypes, (argTypes) => {
        argTypes.splice(1, 0, null);
        classType.registeredClass.constructor_body[argCount - 1] = craftInvokerFunction(humanName, argTypes, null, invoker, rawConstructor);
        return [];
      });
      return [];
    });
  };
  var getFunctionName = (signature) => {
    signature = signature.trim();
    const argsIndex = signature.indexOf("(");
    if (argsIndex === -1) return signature;
    return signature.slice(0, argsIndex);
  };
  var __embind_register_class_function = function(rawClassType, methodName, argCount, rawArgTypesAddr, invokerSignature, rawInvoker, context, isPureVirtual, isAsync, isNonnullReturn) {
    rawClassType >>>= 0;
    methodName >>>= 0;
    rawArgTypesAddr >>>= 0;
    invokerSignature >>>= 0;
    rawInvoker >>>= 0;
    context >>>= 0;
    var rawArgTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
    methodName = AsciiToString(methodName);
    methodName = getFunctionName(methodName);
    rawInvoker = embind__requireFunction(invokerSignature, rawInvoker, isAsync);
    whenDependentTypesAreResolved([], [rawClassType], (classType) => {
      classType = classType[0];
      var humanName = `${classType.name}.${methodName}`;
      if (methodName.startsWith("@@")) {
        methodName = Symbol[methodName.substring(2)];
      }
      if (isPureVirtual) {
        classType.registeredClass.pureVirtualFunctions.push(methodName);
      }
      function unboundTypesHandler() {
        throwUnboundTypeError(`Cannot call ${humanName} due to unbound types`, rawArgTypes);
      }
      var proto = classType.registeredClass.instancePrototype;
      var method = proto[methodName];
      if (void 0 === method || void 0 === method.overloadTable && method.className !== classType.name && method.argCount === argCount - 2) {
        unboundTypesHandler.argCount = argCount - 2;
        unboundTypesHandler.className = classType.name;
        proto[methodName] = unboundTypesHandler;
      } else {
        ensureOverloadTable(proto, methodName, humanName);
        proto[methodName].overloadTable[argCount - 2] = unboundTypesHandler;
      }
      whenDependentTypesAreResolved([], rawArgTypes, (argTypes) => {
        var memberFunction = craftInvokerFunction(humanName, argTypes, classType, rawInvoker, context, isAsync);
        if (void 0 === proto[methodName].overloadTable) {
          memberFunction.argCount = argCount - 2;
          proto[methodName] = memberFunction;
        } else {
          proto[methodName].overloadTable[argCount - 2] = memberFunction;
        }
        return [];
      });
      return [];
    });
  };
  var emval_freelist = [];
  var emval_handles = [0, 1, , 1, null, 1, true, 1, false, 1];
  function __emval_decref(handle) {
    handle >>>= 0;
    if (handle > 9 && 0 === --emval_handles[handle + 1]) {
      emval_handles[handle] = void 0;
      emval_freelist.push(handle);
    }
  }
  var Emval = { toValue: (handle) => {
    if (!handle) {
      throwBindingError(`Cannot use deleted val. handle = ${handle}`);
    }
    return emval_handles[handle];
  }, toHandle: (value) => {
    switch (value) {
      case void 0:
        return 2;
      case null:
        return 4;
      case true:
        return 6;
      case false:
        return 8;
      default: {
        const handle = emval_freelist.pop() || emval_handles.length;
        emval_handles[handle] = value;
        emval_handles[handle + 1] = 1;
        return handle;
      }
    }
  } };
  var EmValType = { name: "emscripten::val", fromWireType: (handle) => {
    var rv = Emval.toValue(handle);
    __emval_decref(handle);
    return rv;
  }, toWireType: (destructors, value) => Emval.toHandle(value), readValueFromPointer: readPointer, destructorFunction: null };
  function __embind_register_emval(rawType) {
    rawType >>>= 0;
    return registerType(rawType, EmValType);
  }
  var enumReadValueFromPointer = (name, width, signed) => {
    switch (width) {
      case 1:
        return signed ? function(pointer) {
          return this.fromWireType(HEAP8[pointer >>> 0]);
        } : function(pointer) {
          return this.fromWireType(HEAPU8[pointer >>> 0]);
        };
      case 2:
        return signed ? function(pointer) {
          return this.fromWireType(HEAP16[pointer >>> 1 >>> 0]);
        } : function(pointer) {
          return this.fromWireType(HEAPU16[pointer >>> 1 >>> 0]);
        };
      case 4:
        return signed ? function(pointer) {
          return this.fromWireType(HEAP32[pointer >>> 2 >>> 0]);
        } : function(pointer) {
          return this.fromWireType(HEAPU32[pointer >>> 2 >>> 0]);
        };
      default:
        throw new TypeError(`invalid integer width (${width}): ${name}`);
    }
  };
  function getEnumValueType(rawValueType) {
    return rawValueType === 0 ? "object" : rawValueType === 1 ? "number" : "string";
  }
  function __embind_register_enum(rawType, name, size, isSigned, rawValueType) {
    rawType >>>= 0;
    name >>>= 0;
    size >>>= 0;
    name = AsciiToString(name);
    const valueType = getEnumValueType(rawValueType);
    switch (valueType) {
      case "object": {
        let ctor = function() {
        };
        ctor.values = {};
        registerType(rawType, { name, constructor: ctor, valueType, fromWireType: function(c) {
          return this.constructor.values[c];
        }, toWireType: (destructors, c) => c.value, readValueFromPointer: enumReadValueFromPointer(name, size, isSigned), destructorFunction: null });
        exposePublicSymbol(name, ctor);
        break;
      }
      case "number": {
        var keysMap = {};
        registerType(rawType, { name, keysMap, valueType, fromWireType: (c) => c, toWireType: (destructors, c) => c, readValueFromPointer: enumReadValueFromPointer(name, size, isSigned), destructorFunction: null });
        exposePublicSymbol(name, keysMap);
        delete Module2[name].argCount;
        break;
      }
      case "string": {
        var valuesMap = {};
        var reverseMap = {};
        var keysMap = {};
        registerType(rawType, { name, valuesMap, reverseMap, keysMap, valueType, fromWireType: function(c) {
          return this.reverseMap[c];
        }, toWireType: function(destructors, c) {
          return this.valuesMap[c];
        }, readValueFromPointer: enumReadValueFromPointer(name, size, isSigned), destructorFunction: null });
        exposePublicSymbol(name, keysMap);
        delete Module2[name].argCount;
        break;
      }
    }
  }
  var requireRegisteredType = (rawType, humanName) => {
    var impl = registeredTypes[rawType];
    if (void 0 === impl) {
      throwBindingError(`${humanName} has unknown type ${getTypeName(rawType)}`);
    }
    return impl;
  };
  function __embind_register_enum_value(rawEnumType, name, enumValue) {
    rawEnumType >>>= 0;
    name >>>= 0;
    var enumType = requireRegisteredType(rawEnumType, "enum");
    name = AsciiToString(name);
    switch (enumType.valueType) {
      case "object": {
        var Enum = enumType.constructor;
        var Value = Object.create(enumType.constructor.prototype, { value: { value: enumValue }, constructor: { value: createNamedFunction(`${enumType.name}_${name}`, function() {
        }) } });
        Enum.values[enumValue] = Value;
        Enum[name] = Value;
        break;
      }
      case "number": {
        enumType.keysMap[name] = enumValue;
        break;
      }
      case "string": {
        enumType.valuesMap[name] = enumValue;
        enumType.reverseMap[enumValue] = name;
        enumType.keysMap[name] = name;
        break;
      }
    }
  }
  var floatReadValueFromPointer = (name, width) => {
    switch (width) {
      case 4:
        return function(pointer) {
          return this.fromWireType(HEAPF32[pointer >>> 2 >>> 0]);
        };
      case 8:
        return function(pointer) {
          return this.fromWireType(HEAPF64[pointer >>> 3 >>> 0]);
        };
      default:
        throw new TypeError(`invalid float width (${width}): ${name}`);
    }
  };
  var __embind_register_float = function(rawType, name, size) {
    rawType >>>= 0;
    name >>>= 0;
    size >>>= 0;
    name = AsciiToString(name);
    registerType(rawType, { name, fromWireType: (value) => value, toWireType: (destructors, value) => value, readValueFromPointer: floatReadValueFromPointer(name, size), destructorFunction: null });
  };
  function __embind_register_function(name, argCount, rawArgTypesAddr, signature, rawInvoker, fn, isAsync, isNonnullReturn) {
    name >>>= 0;
    rawArgTypesAddr >>>= 0;
    signature >>>= 0;
    rawInvoker >>>= 0;
    fn >>>= 0;
    var argTypes = heap32VectorToArray(argCount, rawArgTypesAddr);
    name = AsciiToString(name);
    name = getFunctionName(name);
    rawInvoker = embind__requireFunction(signature, rawInvoker, isAsync);
    exposePublicSymbol(name, function() {
      throwUnboundTypeError(`Cannot call ${name} due to unbound types`, argTypes);
    }, argCount - 1);
    whenDependentTypesAreResolved([], argTypes, (argTypes2) => {
      var invokerArgsArray = [argTypes2[0], null].concat(argTypes2.slice(1));
      replacePublicSymbol(name, craftInvokerFunction(name, invokerArgsArray, null, rawInvoker, fn, isAsync), argCount - 1);
      return [];
    });
  }
  var __embind_register_integer = function(primitiveType, name, size, minRange, maxRange) {
    primitiveType >>>= 0;
    name >>>= 0;
    size >>>= 0;
    name = AsciiToString(name);
    const isUnsignedType = minRange === 0;
    let fromWireType = (value) => value;
    if (isUnsignedType) {
      var bitshift = 32 - 8 * size;
      fromWireType = (value) => value << bitshift >>> bitshift;
      maxRange = fromWireType(maxRange);
    }
    registerType(primitiveType, { name, fromWireType, toWireType: (destructors, value) => value, readValueFromPointer: integerReadValueFromPointer(name, size, minRange !== 0), destructorFunction: null });
  };
  var installIndexedIterator = (proto, sizeMethodName, getMethodName) => {
    const makeIterator = (size, getValue2) => {
      let index = 0;
      return { next() {
        if (index >= size) {
          return { done: true };
        }
        const current = index;
        index++;
        const value = getValue2(current);
        return { value, done: false };
      }, [Symbol.iterator]() {
        return this;
      } };
    };
    if (!proto[Symbol.iterator]) {
      proto[Symbol.iterator] = function() {
        const size = this[sizeMethodName]();
        return makeIterator(size, (i) => this[getMethodName](i));
      };
    }
  };
  var __embind_register_iterable = function(rawClassType, rawElementType, sizeMethodName, getMethodName) {
    rawClassType >>>= 0;
    rawElementType >>>= 0;
    sizeMethodName >>>= 0;
    getMethodName >>>= 0;
    sizeMethodName = AsciiToString(sizeMethodName);
    getMethodName = AsciiToString(getMethodName);
    whenDependentTypesAreResolved([], [rawClassType, rawElementType], (types) => {
      const classType = types[0];
      installIndexedIterator(classType.registeredClass.instancePrototype, sizeMethodName, getMethodName);
      return [];
    });
  };
  function __embind_register_memory_view(rawType, dataTypeIndex, name) {
    rawType >>>= 0;
    name >>>= 0;
    var typeMapping = [Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array, BigInt64Array, BigUint64Array];
    var TA = typeMapping[dataTypeIndex];
    function decodeMemoryView(handle) {
      var size = HEAPU32[handle >>> 2 >>> 0];
      var data = HEAPU32[handle + 4 >>> 2 >>> 0];
      return new TA(HEAP8.buffer, data, size);
    }
    name = AsciiToString(name);
    registerType(rawType, { name, fromWireType: decodeMemoryView, readValueFromPointer: decodeMemoryView }, { ignoreDuplicateRegistrations: true });
  }
  var EmValOptionalType = Object.assign({ optional: true }, EmValType);
  function __embind_register_optional(rawOptionalType, rawType) {
    rawOptionalType >>>= 0;
    rawType >>>= 0;
    registerType(rawOptionalType, EmValOptionalType);
  }
  var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
    outIdx >>>= 0;
    if (!(maxBytesToWrite > 0)) return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i = 0; i < str.length; ++i) {
      var u = str.codePointAt(i);
      if (u <= 127) {
        if (outIdx >= endIdx) break;
        heap[outIdx++ >>> 0] = u;
      } else if (u <= 2047) {
        if (outIdx + 1 >= endIdx) break;
        heap[outIdx++ >>> 0] = 192 | u >> 6;
        heap[outIdx++ >>> 0] = 128 | u & 63;
      } else if (u <= 65535) {
        if (outIdx + 2 >= endIdx) break;
        heap[outIdx++ >>> 0] = 224 | u >> 12;
        heap[outIdx++ >>> 0] = 128 | u >> 6 & 63;
        heap[outIdx++ >>> 0] = 128 | u & 63;
      } else {
        if (outIdx + 3 >= endIdx) break;
        heap[outIdx++ >>> 0] = 240 | u >> 18;
        heap[outIdx++ >>> 0] = 128 | u >> 12 & 63;
        heap[outIdx++ >>> 0] = 128 | u >> 6 & 63;
        heap[outIdx++ >>> 0] = 128 | u & 63;
        i++;
      }
    }
    heap[outIdx >>> 0] = 0;
    return outIdx - startIdx;
  };
  var stringToUTF8 = (str, outPtr, maxBytesToWrite) => stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
  var lengthBytesUTF8 = (str) => {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
      var c = str.charCodeAt(i);
      if (c <= 127) {
        len++;
      } else if (c <= 2047) {
        len += 2;
      } else if (c >= 55296 && c <= 57343) {
        len += 4;
        ++i;
      } else {
        len += 3;
      }
    }
    return len;
  };
  var UTF8Decoder = globalThis.TextDecoder && new TextDecoder();
  var findStringEnd = (heapOrArray, idx, maxBytesToRead, ignoreNul) => {
    var maxIdx = idx + maxBytesToRead;
    if (ignoreNul) return maxIdx;
    while (heapOrArray[idx] && !(idx >= maxIdx)) ++idx;
    return idx;
  };
  var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead, ignoreNul) => {
    idx >>>= 0;
    var endPtr = findStringEnd(heapOrArray, idx, maxBytesToRead, ignoreNul);
    if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
      return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
    }
    var str = "";
    while (idx < endPtr) {
      var u0 = heapOrArray[idx++];
      if (!(u0 & 128)) {
        str += String.fromCharCode(u0);
        continue;
      }
      var u1 = heapOrArray[idx++] & 63;
      if ((u0 & 224) == 192) {
        str += String.fromCharCode((u0 & 31) << 6 | u1);
        continue;
      }
      var u2 = heapOrArray[idx++] & 63;
      if ((u0 & 240) == 224) {
        u0 = (u0 & 15) << 12 | u1 << 6 | u2;
      } else {
        u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | heapOrArray[idx++] & 63;
      }
      if (u0 < 65536) {
        str += String.fromCharCode(u0);
      } else {
        var ch = u0 - 65536;
        str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
      }
    }
    return str;
  };
  var UTF8ToString = (ptr, maxBytesToRead, ignoreNul) => {
    ptr >>>= 0;
    return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead, ignoreNul) : "";
  };
  function __embind_register_std_string(rawType, name) {
    rawType >>>= 0;
    name >>>= 0;
    name = AsciiToString(name);
    var stdStringIsUTF8 = true;
    registerType(rawType, { name, fromWireType(value) {
      var length2 = HEAPU32[value >>> 2 >>> 0];
      var payload = value + 4;
      var str;
      if (stdStringIsUTF8) {
        str = UTF8ToString(payload, length2, true);
      } else {
        str = "";
        for (var i = 0; i < length2; ++i) {
          str += String.fromCharCode(HEAPU8[payload + i >>> 0]);
        }
      }
      _free(value);
      return str;
    }, toWireType(destructors, value) {
      if (value instanceof ArrayBuffer) {
        value = new Uint8Array(value);
      }
      var length2;
      var valueIsOfTypeString = typeof value == "string";
      if (!(valueIsOfTypeString || ArrayBuffer.isView(value) && value.BYTES_PER_ELEMENT == 1)) {
        throwBindingError("Cannot pass non-string to std::string");
      }
      if (stdStringIsUTF8 && valueIsOfTypeString) {
        length2 = lengthBytesUTF8(value);
      } else {
        length2 = value.length;
      }
      var base = _malloc(4 + length2 + 1);
      var ptr = base + 4;
      HEAPU32[base >>> 2 >>> 0] = length2;
      if (valueIsOfTypeString) {
        if (stdStringIsUTF8) {
          stringToUTF8(value, ptr, length2 + 1);
        } else {
          for (var i = 0; i < length2; ++i) {
            var charCode = value.charCodeAt(i);
            if (charCode > 255) {
              _free(base);
              throwBindingError("String has UTF-16 code units that do not fit in 8 bits");
            }
            HEAPU8[ptr + i >>> 0] = charCode;
          }
        }
      } else {
        HEAPU8.set(value, ptr >>> 0);
      }
      if (destructors !== null) {
        destructors.push(_free, base);
      }
      return base;
    }, readValueFromPointer: readPointer, destructorFunction(ptr) {
      _free(ptr);
    } });
  }
  var UTF16Decoder = globalThis.TextDecoder ? new TextDecoder("utf-16le") : void 0;
  var UTF16ToString = (ptr, maxBytesToRead, ignoreNul) => {
    var idx = ptr >>> 1;
    var endIdx = findStringEnd(HEAPU16, idx, maxBytesToRead / 2, ignoreNul);
    if (endIdx - idx > 16 && UTF16Decoder) return UTF16Decoder.decode(HEAPU16.subarray(idx >>> 0, endIdx >>> 0));
    var str = "";
    for (var i = idx; i < endIdx; ++i) {
      var codeUnit = HEAPU16[i >>> 0];
      str += String.fromCharCode(codeUnit);
    }
    return str;
  };
  var stringToUTF16 = (str, outPtr, maxBytesToWrite) => {
    maxBytesToWrite ??= 2147483647;
    if (maxBytesToWrite < 2) return 0;
    maxBytesToWrite -= 2;
    var startPtr = outPtr;
    var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
    for (var i = 0; i < numCharsToWrite; ++i) {
      var codeUnit = str.charCodeAt(i);
      HEAP16[outPtr >>> 1 >>> 0] = codeUnit;
      outPtr += 2;
    }
    HEAP16[outPtr >>> 1 >>> 0] = 0;
    return outPtr - startPtr;
  };
  var lengthBytesUTF16 = (str) => str.length * 2;
  var UTF32ToString = (ptr, maxBytesToRead, ignoreNul) => {
    var str = "";
    var startIdx = ptr >>> 2;
    for (var i = 0; !(i >= maxBytesToRead / 4); i++) {
      var utf32 = HEAPU32[startIdx + i >>> 0];
      if (!utf32 && !ignoreNul) break;
      str += String.fromCodePoint(utf32);
    }
    return str;
  };
  var stringToUTF32 = (str, outPtr, maxBytesToWrite) => {
    outPtr >>>= 0;
    maxBytesToWrite ??= 2147483647;
    if (maxBytesToWrite < 4) return 0;
    var startPtr = outPtr;
    var endPtr = startPtr + maxBytesToWrite - 4;
    for (var i = 0; i < str.length; ++i) {
      var codePoint = str.codePointAt(i);
      if (codePoint > 65535) {
        i++;
      }
      HEAP32[outPtr >>> 2 >>> 0] = codePoint;
      outPtr += 4;
      if (outPtr + 4 > endPtr) break;
    }
    HEAP32[outPtr >>> 2 >>> 0] = 0;
    return outPtr - startPtr;
  };
  var lengthBytesUTF32 = (str) => {
    var len = 0;
    for (var i = 0; i < str.length; ++i) {
      var codePoint = str.codePointAt(i);
      if (codePoint > 65535) {
        i++;
      }
      len += 4;
    }
    return len;
  };
  function __embind_register_std_wstring(rawType, charSize, name) {
    rawType >>>= 0;
    charSize >>>= 0;
    name >>>= 0;
    name = AsciiToString(name);
    var decodeString, encodeString, lengthBytesUTF;
    if (charSize === 2) {
      decodeString = UTF16ToString;
      encodeString = stringToUTF16;
      lengthBytesUTF = lengthBytesUTF16;
    } else {
      decodeString = UTF32ToString;
      encodeString = stringToUTF32;
      lengthBytesUTF = lengthBytesUTF32;
    }
    registerType(rawType, { name, fromWireType: (value) => {
      var length2 = HEAPU32[value >>> 2 >>> 0];
      var str = decodeString(value + 4, length2 * charSize, true);
      _free(value);
      return str;
    }, toWireType: (destructors, value) => {
      if (!(typeof value == "string")) {
        throwBindingError(`Cannot pass non-string to C++ string type ${name}`);
      }
      var length2 = lengthBytesUTF(value);
      var ptr = _malloc(4 + length2 + charSize);
      HEAPU32[ptr >>> 2 >>> 0] = length2 / charSize;
      encodeString(value, ptr + 4, length2 + charSize);
      if (destructors !== null) {
        destructors.push(_free, ptr);
      }
      return ptr;
    }, readValueFromPointer: readPointer, destructorFunction(ptr) {
      _free(ptr);
    } });
  }
  function __embind_register_value_object(rawType, name, constructorSignature, rawConstructor, destructorSignature, rawDestructor) {
    rawType >>>= 0;
    name >>>= 0;
    constructorSignature >>>= 0;
    rawConstructor >>>= 0;
    destructorSignature >>>= 0;
    rawDestructor >>>= 0;
    structRegistrations[rawType] = { name: AsciiToString(name), rawConstructor: embind__requireFunction(constructorSignature, rawConstructor), rawDestructor: embind__requireFunction(destructorSignature, rawDestructor), fields: [] };
  }
  function __embind_register_value_object_field(structType, fieldName, getterReturnType, getterSignature, getter, getterContext, setterArgumentType, setterSignature, setter, setterContext) {
    structType >>>= 0;
    fieldName >>>= 0;
    getterReturnType >>>= 0;
    getterSignature >>>= 0;
    getter >>>= 0;
    getterContext >>>= 0;
    setterArgumentType >>>= 0;
    setterSignature >>>= 0;
    setter >>>= 0;
    setterContext >>>= 0;
    structRegistrations[structType].fields.push({ fieldName: AsciiToString(fieldName), getterReturnType, getter: embind__requireFunction(getterSignature, getter), getterContext, setterArgumentType, setter: embind__requireFunction(setterSignature, setter), setterContext });
  }
  var __embind_register_void = function(rawType, name) {
    rawType >>>= 0;
    name >>>= 0;
    name = AsciiToString(name);
    registerType(rawType, { isVoid: true, name, fromWireType: () => void 0, toWireType: (destructors, o) => void 0 });
  };
  function __emval_array_to_memory_view(dst, src) {
    dst >>>= 0;
    src >>>= 0;
    dst = Emval.toValue(dst);
    src = Emval.toValue(src);
    dst.set(src);
  }
  var emval_methodCallers = [];
  var emval_addMethodCaller = (caller) => {
    var id = emval_methodCallers.length;
    emval_methodCallers.push(caller);
    return id;
  };
  var emval_lookupTypes = (argCount, argTypes) => {
    var a = new Array(argCount);
    for (var i = 0; i < argCount; ++i) {
      a[i] = requireRegisteredType(HEAPU32[argTypes + i * 4 >>> 2 >>> 0], `parameter ${i}`);
    }
    return a;
  };
  var emval_returnValue = (toReturnWire, destructorsRef, handle) => {
    var destructors = [];
    var result = toReturnWire(destructors, handle);
    if (destructors.length) {
      HEAPU32[destructorsRef >>> 2 >>> 0] = Emval.toHandle(destructors);
    }
    return result;
  };
  var emval_symbols = {};
  var getStringOrSymbol = (address) => {
    var symbol = emval_symbols[address];
    if (symbol === void 0) {
      return AsciiToString(address);
    }
    return symbol;
  };
  var __emval_create_invoker = function(argCount, argTypesPtr, kind) {
    argTypesPtr >>>= 0;
    var GenericWireTypeSize = 8;
    var [retType, ...argTypes] = emval_lookupTypes(argCount, argTypesPtr);
    var toReturnWire = retType.toWireType.bind(retType);
    var argFromPtr = argTypes.map((type) => type.readValueFromPointer.bind(type));
    argCount--;
    var captures = { toValue: Emval.toValue };
    var args = argFromPtr.map((argFromPtr2, i) => {
      var captureName = `argFromPtr${i}`;
      captures[captureName] = argFromPtr2;
      return `${captureName}(args${i ? "+" + i * GenericWireTypeSize : ""})`;
    });
    var functionBody;
    switch (kind) {
      case 0:
        functionBody = "toValue(handle)";
        break;
      case 2:
        functionBody = "new (toValue(handle))";
        break;
      case 3:
        functionBody = "";
        break;
      case 1:
        captures["getStringOrSymbol"] = getStringOrSymbol;
        functionBody = "toValue(handle)[getStringOrSymbol(methodName)]";
        break;
    }
    functionBody += `(${args})`;
    if (!retType.isVoid) {
      captures["toReturnWire"] = toReturnWire;
      captures["emval_returnValue"] = emval_returnValue;
      functionBody = `return emval_returnValue(toReturnWire, destructorsRef, ${functionBody})`;
    }
    functionBody = `return function (handle, methodName, destructorsRef, args) {
${functionBody}
}`;
    var invokerFunction = new Function(Object.keys(captures), functionBody)(...Object.values(captures));
    var functionName = `methodCaller<(${argTypes.map((t) => t.name)}) => ${retType.name}>`;
    return emval_addMethodCaller(createNamedFunction(functionName, invokerFunction));
  };
  function __emval_equals(first, second) {
    first >>>= 0;
    second >>>= 0;
    first = Emval.toValue(first);
    second = Emval.toValue(second);
    return first == second;
  }
  function __emval_get_property(handle, key) {
    handle >>>= 0;
    key >>>= 0;
    handle = Emval.toValue(handle);
    key = Emval.toValue(key);
    return Emval.toHandle(handle[key]);
  }
  function __emval_incref(handle) {
    handle >>>= 0;
    if (handle > 9) {
      emval_handles[handle + 1] += 1;
    }
  }
  function __emval_invoke(caller, handle, methodName, destructorsRef, args) {
    caller >>>= 0;
    handle >>>= 0;
    methodName >>>= 0;
    destructorsRef >>>= 0;
    args >>>= 0;
    return emval_methodCallers[caller](handle, methodName, destructorsRef, args);
  }
  function __emval_new_cstring(v) {
    v >>>= 0;
    return Emval.toHandle(getStringOrSymbol(v));
  }
  function __emval_new_object() {
    return Emval.toHandle({});
  }
  function __emval_run_destructors(handle) {
    handle >>>= 0;
    var destructors = Emval.toValue(handle);
    runDestructors(destructors);
    __emval_decref(handle);
  }
  function __emval_set_property(handle, key, value) {
    handle >>>= 0;
    key >>>= 0;
    value >>>= 0;
    handle = Emval.toValue(handle);
    key = Emval.toValue(key);
    value = Emval.toValue(value);
    handle[key] = value;
  }
  var getHeapMax = () => 4294901760;
  var alignMemory = (size, alignment) => Math.ceil(size / alignment) * alignment;
  var growMemory = (size) => {
    var oldHeapSize = wasmMemory.buffer.byteLength;
    var pages = (size - oldHeapSize + 65535) / 65536 | 0;
    try {
      wasmMemory.grow(pages);
      updateMemoryViews();
      return 1;
    } catch (e) {
    }
  };
  function _emscripten_resize_heap(requestedSize) {
    requestedSize >>>= 0;
    var oldSize = HEAPU8.length;
    var maxHeapSize = getHeapMax();
    if (requestedSize > maxHeapSize) {
      return false;
    }
    for (var cutDown = 1; cutDown <= 4; cutDown *= 2) {
      var overGrownHeapSize = oldSize * (1 + 0.2 / cutDown);
      overGrownHeapSize = Math.min(overGrownHeapSize, requestedSize + 100663296);
      var newSize = Math.min(maxHeapSize, alignMemory(Math.max(requestedSize, overGrownHeapSize), 65536));
      var replacement = growMemory(newSize);
      if (replacement) {
        return true;
      }
    }
    return false;
  }
  var updateTableMap = (offset, count) => {
    if (functionsInTableMap) {
      for (var i = offset; i < offset + count; i++) {
        var item = getWasmTableEntry(i);
        if (item) {
          functionsInTableMap.set(item, i);
        }
      }
    }
  };
  var functionsInTableMap;
  var getFunctionAddress = (func) => {
    if (!functionsInTableMap) {
      functionsInTableMap = /* @__PURE__ */ new WeakMap();
      updateTableMap(0, wasmTable.length);
    }
    return functionsInTableMap.get(func) || 0;
  };
  var freeTableIndexes = [];
  var getEmptyTableSlot = () => {
    if (freeTableIndexes.length) {
      return freeTableIndexes.pop();
    }
    return wasmTable["grow"](1);
  };
  var setWasmTableEntry = (idx, func) => wasmTable.set(idx, func);
  var uleb128EncodeWithLen = (arr) => {
    const n = arr.length;
    return [n % 128 | 128, n >> 7, ...arr];
  };
  var wasmTypeCodes = { i: 127, p: 127, j: 126, f: 125, d: 124, e: 111 };
  var generateTypePack = (types) => uleb128EncodeWithLen(Array.from(types, (type) => {
    var code = wasmTypeCodes[type];
    return code;
  }));
  var convertJsFunctionToWasm = (func, sig) => {
    var bytes = Uint8Array.of(0, 97, 115, 109, 1, 0, 0, 0, 1, ...uleb128EncodeWithLen([1, 96, ...generateTypePack(sig.slice(1)), ...generateTypePack(sig[0] === "v" ? "" : sig[0])]), 2, 7, 1, 1, 101, 1, 102, 0, 0, 7, 5, 1, 1, 102, 0, 0);
    var module = new WebAssembly.Module(bytes);
    var instance = new WebAssembly.Instance(module, { e: { f: func } });
    var wrappedFunc = instance.exports["f"];
    return wrappedFunc;
  };
  var addFunction = (func, sig) => {
    var rtn = getFunctionAddress(func);
    if (rtn) {
      return rtn;
    }
    var ret = getEmptyTableSlot();
    try {
      setWasmTableEntry(ret, func);
    } catch (err2) {
      if (!(err2 instanceof TypeError)) {
        throw err2;
      }
      var wrapped = convertJsFunctionToWasm(func, sig);
      setWasmTableEntry(ret, wrapped);
    }
    functionsInTableMap.set(func, ret);
    return ret;
  };
  var removeFunction = (index) => {
    functionsInTableMap.delete(getWasmTableEntry(index));
    setWasmTableEntry(index, null);
    freeTableIndexes.push(index);
  };
  init_ClassHandle();
  init_RegisteredPointer();
  {
    if (Module2["noExitRuntime"]) noExitRuntime = Module2["noExitRuntime"];
    if (Module2["print"]) out = Module2["print"];
    if (Module2["printErr"]) err = Module2["printErr"];
    if (Module2["wasmBinary"]) wasmBinary = Module2["wasmBinary"];
    if (Module2["arguments"]) arguments_ = Module2["arguments"];
    if (Module2["thisProgram"]) thisProgram = Module2["thisProgram"];
    if (Module2["preInit"]) {
      if (typeof Module2["preInit"] == "function") Module2["preInit"] = [Module2["preInit"]];
      while (Module2["preInit"].length > 0) {
        Module2["preInit"].shift()();
      }
    }
  }
  Module2["addFunction"] = addFunction;
  Module2["removeFunction"] = removeFunction;
  var ___getTypeName, _malloc, _free, memory, __indirect_function_table, wasmMemory, wasmTable;
  function assignWasmExports(wasmExports2) {
    ___getTypeName = wasmExports2["K"];
    _malloc = wasmExports2["M"];
    _free = wasmExports2["N"];
    memory = wasmMemory = wasmExports2["I"];
    __indirect_function_table = wasmTable = wasmExports2["L"];
  }
  var wasmImports = { l: ___cxa_throw, C: __abort_js, q: __embind_finalize_value_object, z: __embind_register_bigint, G: __embind_register_bool, j: __embind_register_class, i: __embind_register_class_constructor, a: __embind_register_class_function, E: __embind_register_emval, x: __embind_register_enum, d: __embind_register_enum_value, y: __embind_register_float, c: __embind_register_function, p: __embind_register_integer, m: __embind_register_iterable, h: __embind_register_memory_view, n: __embind_register_optional, F: __embind_register_std_string, w: __embind_register_std_wstring, r: __embind_register_value_object, k: __embind_register_value_object_field, H: __embind_register_void, u: __emval_array_to_memory_view, g: __emval_create_invoker, b: __emval_decref, o: __emval_equals, B: __emval_get_property, t: __emval_incref, f: __emval_invoke, s: __emval_new_cstring, A: __emval_new_object, e: __emval_run_destructors, v: __emval_set_property, D: _emscripten_resize_heap };
  function applySignatureConversions(wasmExports2) {
    wasmExports2 = Object.assign({}, wasmExports2);
    var makeWrapper_pp = (f) => (a0) => f(a0) >>> 0;
    var makeWrapper_p = (f) => () => f() >>> 0;
    wasmExports2["K"] = makeWrapper_pp(wasmExports2["K"]);
    wasmExports2["M"] = makeWrapper_pp(wasmExports2["M"]);
    wasmExports2["_emscripten_stack_alloc"] = makeWrapper_pp(wasmExports2["_emscripten_stack_alloc"]);
    wasmExports2["emscripten_stack_get_current"] = makeWrapper_p(wasmExports2["emscripten_stack_get_current"]);
    return wasmExports2;
  }
  function run() {
    preRun();
    function doRun() {
      Module2["calledRun"] = true;
      if (ABORT) return;
      initRuntime();
      readyPromiseResolve?.(Module2);
      Module2["onRuntimeInitialized"]?.();
      postRun();
    }
    if (Module2["setStatus"]) {
      Module2["setStatus"]("Running...");
      setTimeout(() => {
        setTimeout(() => Module2["setStatus"](""), 1);
        doRun();
      }, 1);
    } else {
      doRun();
    }
  }
  var wasmExports;
  wasmExports = await createWasm();
  run();
  if (runtimeInitialized) {
    moduleRtn = Module2;
  } else {
    moduleRtn = new Promise((resolve, reject) => {
      readyPromiseResolve = resolve;
      readyPromiseReject = reject;
    });
  }
  ;
  return moduleRtn;
}
var manifold_default = Module;

// src/void/solid/kernel.js
var _instance = null;
var _initPromise = null;
function locateFile(path) {
  return `../wasm/${path}`;
}
async function ensureKernel() {
  if (_instance) return _instance;
  if (_initPromise) return _initPromise;
  _initPromise = manifold_default({ locateFile }).then((inst) => {
    inst.setup();
    _instance = inst;
    return _instance;
  }).catch((error) => {
    console.warn("void.solid.kernel init failed", error);
    return null;
  });
  return _initPromise;
}
async function extrudePolygons(polygons, height = 1) {
  const inst = await ensureKernel();
  if (!inst?.Manifold || !Array.isArray(polygons) || !polygons.length) {
    return null;
  }
  try {
    const man = inst.Manifold.extrude(polygons, Number(height) || 1);
    const mesh = man.getMesh();
    return { manifold: man, mesh };
  } catch (error) {
    console.warn("void.solid.kernel extrude failed", error);
    return null;
  }
}
function toKernelMesh(inst, meshData) {
  const positions = meshData?.positions;
  const indices = meshData?.indices;
  if (!positions?.length || !indices?.length) return null;
  const vertCount = Math.floor(positions.length / 3);
  const props = new Float32Array(vertCount * 3);
  props.set(positions);
  const rec = {
    numProp: 3,
    vertProperties: props,
    triVerts: Uint32Array.from(indices)
  };
  if (meshData?.mergeFromVert?.length) rec.mergeFromVert = Uint32Array.from(meshData.mergeFromVert);
  if (meshData?.mergeToVert?.length) rec.mergeToVert = Uint32Array.from(meshData.mergeToVert);
  if (meshData?.runIndex?.length) rec.runIndex = Uint32Array.from(meshData.runIndex);
  if (meshData?.runOriginalID?.length) rec.runOriginalID = Uint32Array.from(meshData.runOriginalID);
  if (meshData?.faceID?.length) rec.faceID = Uint32Array.from(meshData.faceID);
  if (meshData?.halfedgeTangent?.length) rec.halfedgeTangent = Float32Array.from(meshData.halfedgeTangent);
  if (meshData?.runTransform?.length) rec.runTransform = Float32Array.from(meshData.runTransform);
  return new inst.Mesh(rec);
}
function fromKernelMesh(mesh) {
  const numProp = Math.max(3, Number(mesh?.numProp || 3));
  const verts = mesh?.vertProperties;
  const triVerts = mesh?.triVerts;
  if (!verts?.length || !triVerts?.length) return null;
  const vertCount = Math.floor(verts.length / numProp);
  const positions = new Float32Array(vertCount * 3);
  for (let i = 0; i < vertCount; i++) {
    const src = i * numProp;
    const dst = i * 3;
    positions[dst] = Number(verts[src] || 0);
    positions[dst + 1] = Number(verts[src + 1] || 0);
    positions[dst + 2] = Number(verts[src + 2] || 0);
  }
  const out = {
    positions,
    indices: Uint32Array.from(triVerts)
  };
  if (mesh?.mergeFromVert?.length) out.mergeFromVert = Uint32Array.from(mesh.mergeFromVert);
  if (mesh?.mergeToVert?.length) out.mergeToVert = Uint32Array.from(mesh.mergeToVert);
  if (mesh?.runIndex?.length) out.runIndex = Uint32Array.from(mesh.runIndex);
  if (mesh?.runOriginalID?.length) out.runOriginalID = Uint32Array.from(mesh.runOriginalID);
  if (mesh?.faceID?.length) out.faceID = Uint32Array.from(mesh.faceID);
  if (mesh?.halfedgeTangent?.length) out.halfedgeTangent = Float32Array.from(mesh.halfedgeTangent);
  if (mesh?.runTransform?.length) out.runTransform = Float32Array.from(mesh.runTransform);
  return out;
}
async function booleanMeshes(input, mode = "add") {
  const inst = await ensureKernel();
  if (!inst?.Manifold) {
    return null;
  }
  const options = Array.isArray(input) ? { meshes: input, mode } : { ...input || {}, mode: String((input || {}).mode || mode || "add") };
  const op = String(options.mode || "add");
  const meshes = Array.isArray(options.meshes) ? options.meshes : [];
  const targetMeshes = Array.isArray(options.targets) ? options.targets : null;
  const toolMeshes = Array.isArray(options.tools) ? options.tools : null;
  const manifolds = [];
  const runSourceSolidIdsByOriginal = {};
  let result = null;
  try {
    const toManifold = (meshData) => {
      const kernelMesh = toKernelMesh(inst, meshData);
      const manifold = kernelMesh ? new inst.Manifold(kernelMesh) : null;
      if (!manifold) return null;
      try {
        const infoMesh = manifold.getMesh?.();
        const runOriginalID = Array.isArray(infoMesh?.runOriginalID) ? infoMesh.runOriginalID : infoMesh?.runOriginalID ? Array.from(infoMesh.runOriginalID) : [];
        const sourceIds = Array.isArray(meshData?.source_solid_ids) ? meshData.source_solid_ids.map((id) => String(id || "")).filter(Boolean) : [];
        const first = Number(runOriginalID?.[0]);
        if (Number.isFinite(first) && sourceIds.length) {
          runSourceSolidIdsByOriginal[String(first)] = sourceIds;
        }
      } catch {
      }
      return manifold;
    };
    const combine = (list, kind = "add") => {
      if (!Array.isArray(list) || !list.length) return null;
      if (list.length === 1) return list[0];
      if (kind === "intersect") return inst.Manifold.intersection(list);
      if (kind === "subtract") return inst.Manifold.difference(list);
      return inst.Manifold.union(list);
    };
    if (op === "subtract" && targetMeshes && toolMeshes) {
      const targetMfs = targetMeshes.map(toManifold).filter(Boolean);
      const toolMfs = toolMeshes.map(toManifold).filter(Boolean);
      manifolds.push(...targetMfs, ...toolMfs);
      if (!targetMfs.length || !toolMfs.length) {
        return null;
      }
      const targetUnion = combine(targetMfs, "add");
      const toolUnion = combine(toolMfs, "add");
      if (!targetUnion || !toolUnion) return null;
      if (!targetMfs.includes(targetUnion)) manifolds.push(targetUnion);
      if (!toolMfs.includes(toolUnion)) manifolds.push(toolUnion);
      result = inst.Manifold.difference([targetUnion, toolUnion]);
    } else {
      for (const meshData of meshes) {
        const manifold = toManifold(meshData);
        if (!manifold) continue;
        manifolds.push(manifold);
      }
      if (manifolds.length < 2) {
        return null;
      }
      if (op === "intersect") {
        result = inst.Manifold.intersection(manifolds);
      } else {
        result = inst.Manifold.union(manifolds);
      }
    }
    const mesh = result?.getMesh?.();
    if (!mesh) return null;
    const outMesh = fromKernelMesh(mesh);
    if (Object.keys(runSourceSolidIdsByOriginal).length) {
      outMesh.run_source_solid_ids = runSourceSolidIdsByOriginal;
    }
    return { mesh: outMesh };
  } catch (error) {
    console.warn("void.solid.kernel boolean failed", error);
    return null;
  } finally {
    for (const manifold of manifolds) {
      manifold?.delete?.();
    }
    result?.delete?.();
  }
}

// src/void/solid/provenance.js
function buildSeedProvenance(feature, profileTarget, bodyIndex = 0) {
  return {
    source: {
      feature_id: feature?.id || null,
      feature_type: feature?.type || null,
      profile: profileTarget || null
    },
    faces: [
      { role: "cap_start", source: profileTarget || null },
      { role: "cap_end", source: profileTarget || null },
      { role: "side", source: profileTarget || null }
    ],
    body_index: bodyIndex
  };
}

// src/ext/clip2.js
(function() {
  "use strict";
  var ClipperLib2 = {};
  ClipperLib2.version = "6.4.2.2";
  ClipperLib2.use_lines = true;
  ClipperLib2.use_xyz = false;
  var isNode = false;
  if (false) {
    clip2_module.exports = ClipperLib2;
    isNode = true;
  } else {
    if (typeof define === "function" && define.amd) {
      define(ClipperLib2);
    }
    if (typeof document !== "undefined") window.ClipperLib = ClipperLib2;
    else self["ClipperLib"] = ClipperLib2;
  }
  var navigator_appName;
  if (!isNode) {
    var nav = navigator.userAgent.toString().toLowerCase();
    navigator_appName = navigator.appName;
  } else {
    var nav = "chrome";
    navigator_appName = "Netscape";
  }
  var browser = {};
  if (nav.indexOf("chrome") != -1 && nav.indexOf("chromium") == -1) browser.chrome = 1;
  else browser.chrome = 0;
  if (nav.indexOf("chromium") != -1) browser.chromium = 1;
  else browser.chromium = 0;
  if (nav.indexOf("safari") != -1 && nav.indexOf("chrome") == -1 && nav.indexOf("chromium") == -1) browser.safari = 1;
  else browser.safari = 0;
  if (nav.indexOf("firefox") != -1) browser.firefox = 1;
  else browser.firefox = 0;
  if (nav.indexOf("firefox/17") != -1) browser.firefox17 = 1;
  else browser.firefox17 = 0;
  if (nav.indexOf("firefox/15") != -1) browser.firefox15 = 1;
  else browser.firefox15 = 0;
  if (nav.indexOf("firefox/3") != -1) browser.firefox3 = 1;
  else browser.firefox3 = 0;
  if (nav.indexOf("opera") != -1) browser.opera = 1;
  else browser.opera = 0;
  if (nav.indexOf("msie 10") != -1) browser.msie10 = 1;
  else browser.msie10 = 0;
  if (nav.indexOf("msie 9") != -1) browser.msie9 = 1;
  else browser.msie9 = 0;
  if (nav.indexOf("msie 8") != -1) browser.msie8 = 1;
  else browser.msie8 = 0;
  if (nav.indexOf("msie 7") != -1) browser.msie7 = 1;
  else browser.msie7 = 0;
  if (nav.indexOf("msie ") != -1) browser.msie = 1;
  else browser.msie = 0;
  ClipperLib2.biginteger_used = null;
  var dbits;
  var canary = 244837814094590;
  var j_lm = (canary & 16777215) == 15715070;
  function BigInteger(a, b, c) {
    ClipperLib2.biginteger_used = 1;
    if (a != null)
      if ("number" == typeof a && "undefined" == typeof b) this.fromInt(a);
      else if ("number" == typeof a) this.fromNumber(a, b, c);
      else if (b == null && "string" != typeof a) this.fromString(a, 256);
      else this.fromString(a, b);
  }
  function nbi() {
    return new BigInteger(null, void 0, void 0);
  }
  function am1(i, x, w, j, c, n) {
    while (--n >= 0) {
      var v = x * this[i++] + w[j] + c;
      c = Math.floor(v / 67108864);
      w[j++] = v & 67108863;
    }
    return c;
  }
  function am2(i, x, w, j, c, n) {
    var xl = x & 32767, xh = x >> 15;
    while (--n >= 0) {
      var l = this[i] & 32767;
      var h = this[i++] >> 15;
      var m = xh * l + h * xl;
      l = xl * l + ((m & 32767) << 15) + w[j] + (c & 1073741823);
      c = (l >>> 30) + (m >>> 15) + xh * h + (c >>> 30);
      w[j++] = l & 1073741823;
    }
    return c;
  }
  function am3(i, x, w, j, c, n) {
    var xl = x & 16383, xh = x >> 14;
    while (--n >= 0) {
      var l = this[i] & 16383;
      var h = this[i++] >> 14;
      var m = xh * l + h * xl;
      l = xl * l + ((m & 16383) << 14) + w[j] + c;
      c = (l >> 28) + (m >> 14) + xh * h;
      w[j++] = l & 268435455;
    }
    return c;
  }
  if (j_lm && navigator_appName == "Microsoft Internet Explorer") {
    BigInteger.prototype.am = am2;
    dbits = 30;
  } else if (j_lm && navigator_appName != "Netscape") {
    BigInteger.prototype.am = am1;
    dbits = 26;
  } else {
    BigInteger.prototype.am = am3;
    dbits = 28;
  }
  BigInteger.prototype.DB = dbits;
  BigInteger.prototype.DM = (1 << dbits) - 1;
  BigInteger.prototype.DV = 1 << dbits;
  var BI_FP = 52;
  BigInteger.prototype.FV = Math.pow(2, BI_FP);
  BigInteger.prototype.F1 = BI_FP - dbits;
  BigInteger.prototype.F2 = 2 * dbits - BI_FP;
  var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
  var BI_RC = new Array();
  var rr, vv;
  rr = "0".charCodeAt(0);
  for (vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
  rr = "a".charCodeAt(0);
  for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
  rr = "A".charCodeAt(0);
  for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
  function int2char(n) {
    return BI_RM.charAt(n);
  }
  function intAt(s, i) {
    var c = BI_RC[s.charCodeAt(i)];
    return c == null ? -1 : c;
  }
  function bnpCopyTo(r) {
    for (var i = this.t - 1; i >= 0; --i) r[i] = this[i];
    r.t = this.t;
    r.s = this.s;
  }
  function bnpFromInt(x) {
    this.t = 1;
    this.s = x < 0 ? -1 : 0;
    if (x > 0) this[0] = x;
    else if (x < -1) this[0] = x + this.DV;
    else this.t = 0;
  }
  function nbv(i) {
    var r = nbi();
    r.fromInt(i);
    return r;
  }
  function bnpFromString(s, b) {
    var k;
    if (b == 16) k = 4;
    else if (b == 8) k = 3;
    else if (b == 256) k = 8;
    else if (b == 2) k = 1;
    else if (b == 32) k = 5;
    else if (b == 4) k = 2;
    else {
      this.fromRadix(s, b);
      return;
    }
    this.t = 0;
    this.s = 0;
    var i = s.length, mi = false, sh = 0;
    while (--i >= 0) {
      var x = k == 8 ? s[i] & 255 : intAt(s, i);
      if (x < 0) {
        if (s.charAt(i) == "-") mi = true;
        continue;
      }
      mi = false;
      if (sh == 0)
        this[this.t++] = x;
      else if (sh + k > this.DB) {
        this[this.t - 1] |= (x & (1 << this.DB - sh) - 1) << sh;
        this[this.t++] = x >> this.DB - sh;
      } else
        this[this.t - 1] |= x << sh;
      sh += k;
      if (sh >= this.DB) sh -= this.DB;
    }
    if (k == 8 && (s[0] & 128) != 0) {
      this.s = -1;
      if (sh > 0) this[this.t - 1] |= (1 << this.DB - sh) - 1 << sh;
    }
    this.clamp();
    if (mi) BigInteger.ZERO.subTo(this, this);
  }
  function bnpClamp() {
    var c = this.s & this.DM;
    while (this.t > 0 && this[this.t - 1] == c) --this.t;
  }
  function bnToString(b) {
    if (this.s < 0) return "-" + this.negate().toString(b);
    var k;
    if (b == 16) k = 4;
    else if (b == 8) k = 3;
    else if (b == 2) k = 1;
    else if (b == 32) k = 5;
    else if (b == 4) k = 2;
    else return this.toRadix(b);
    var km = (1 << k) - 1, d, m = false, r = "", i = this.t;
    var p = this.DB - i * this.DB % k;
    if (i-- > 0) {
      if (p < this.DB && (d = this[i] >> p) > 0) {
        m = true;
        r = int2char(d);
      }
      while (i >= 0) {
        if (p < k) {
          d = (this[i] & (1 << p) - 1) << k - p;
          d |= this[--i] >> (p += this.DB - k);
        } else {
          d = this[i] >> (p -= k) & km;
          if (p <= 0) {
            p += this.DB;
            --i;
          }
        }
        if (d > 0) m = true;
        if (m) r += int2char(d);
      }
    }
    return m ? r : "0";
  }
  function bnNegate() {
    var r = nbi();
    BigInteger.ZERO.subTo(this, r);
    return r;
  }
  function bnAbs() {
    return this.s < 0 ? this.negate() : this;
  }
  function bnCompareTo(a) {
    var r = this.s - a.s;
    if (r != 0) return r;
    var i = this.t;
    r = i - a.t;
    if (r != 0) return this.s < 0 ? -r : r;
    while (--i >= 0)
      if ((r = this[i] - a[i]) != 0) return r;
    return 0;
  }
  function nbits(x) {
    var r = 1, t;
    if ((t = x >>> 16) != 0) {
      x = t;
      r += 16;
    }
    if ((t = x >> 8) != 0) {
      x = t;
      r += 8;
    }
    if ((t = x >> 4) != 0) {
      x = t;
      r += 4;
    }
    if ((t = x >> 2) != 0) {
      x = t;
      r += 2;
    }
    if ((t = x >> 1) != 0) {
      x = t;
      r += 1;
    }
    return r;
  }
  function bnBitLength() {
    if (this.t <= 0) return 0;
    return this.DB * (this.t - 1) + nbits(this[this.t - 1] ^ this.s & this.DM);
  }
  function bnpDLShiftTo(n, r) {
    var i;
    for (i = this.t - 1; i >= 0; --i) r[i + n] = this[i];
    for (i = n - 1; i >= 0; --i) r[i] = 0;
    r.t = this.t + n;
    r.s = this.s;
  }
  function bnpDRShiftTo(n, r) {
    for (var i = n; i < this.t; ++i) r[i - n] = this[i];
    r.t = Math.max(this.t - n, 0);
    r.s = this.s;
  }
  function bnpLShiftTo(n, r) {
    var bs = n % this.DB;
    var cbs = this.DB - bs;
    var bm = (1 << cbs) - 1;
    var ds = Math.floor(n / this.DB), c = this.s << bs & this.DM, i;
    for (i = this.t - 1; i >= 0; --i) {
      r[i + ds + 1] = this[i] >> cbs | c;
      c = (this[i] & bm) << bs;
    }
    for (i = ds - 1; i >= 0; --i) r[i] = 0;
    r[ds] = c;
    r.t = this.t + ds + 1;
    r.s = this.s;
    r.clamp();
  }
  function bnpRShiftTo(n, r) {
    r.s = this.s;
    var ds = Math.floor(n / this.DB);
    if (ds >= this.t) {
      r.t = 0;
      return;
    }
    var bs = n % this.DB;
    var cbs = this.DB - bs;
    var bm = (1 << bs) - 1;
    r[0] = this[ds] >> bs;
    for (var i = ds + 1; i < this.t; ++i) {
      r[i - ds - 1] |= (this[i] & bm) << cbs;
      r[i - ds] = this[i] >> bs;
    }
    if (bs > 0) r[this.t - ds - 1] |= (this.s & bm) << cbs;
    r.t = this.t - ds;
    r.clamp();
  }
  function bnpSubTo(a, r) {
    var i = 0, c = 0, m = Math.min(a.t, this.t);
    while (i < m) {
      c += this[i] - a[i];
      r[i++] = c & this.DM;
      c >>= this.DB;
    }
    if (a.t < this.t) {
      c -= a.s;
      while (i < this.t) {
        c += this[i];
        r[i++] = c & this.DM;
        c >>= this.DB;
      }
      c += this.s;
    } else {
      c += this.s;
      while (i < a.t) {
        c -= a[i];
        r[i++] = c & this.DM;
        c >>= this.DB;
      }
      c -= a.s;
    }
    r.s = c < 0 ? -1 : 0;
    if (c < -1) r[i++] = this.DV + c;
    else if (c > 0) r[i++] = c;
    r.t = i;
    r.clamp();
  }
  function bnpMultiplyTo(a, r) {
    var x = this.abs(), y = a.abs();
    var i = x.t;
    r.t = i + y.t;
    while (--i >= 0) r[i] = 0;
    for (i = 0; i < y.t; ++i) r[i + x.t] = x.am(0, y[i], r, i, 0, x.t);
    r.s = 0;
    r.clamp();
    if (this.s != a.s) BigInteger.ZERO.subTo(r, r);
  }
  function bnpSquareTo(r) {
    var x = this.abs();
    var i = r.t = 2 * x.t;
    while (--i >= 0) r[i] = 0;
    for (i = 0; i < x.t - 1; ++i) {
      var c = x.am(i, x[i], r, 2 * i, 0, 1);
      if ((r[i + x.t] += x.am(i + 1, 2 * x[i], r, 2 * i + 1, c, x.t - i - 1)) >= x.DV) {
        r[i + x.t] -= x.DV;
        r[i + x.t + 1] = 1;
      }
    }
    if (r.t > 0) r[r.t - 1] += x.am(i, x[i], r, 2 * i, 0, 1);
    r.s = 0;
    r.clamp();
  }
  function bnpDivRemTo(m, q, r) {
    var pm = m.abs();
    if (pm.t <= 0) return;
    var pt = this.abs();
    if (pt.t < pm.t) {
      if (q != null) q.fromInt(0);
      if (r != null) this.copyTo(r);
      return;
    }
    if (r == null) r = nbi();
    var y = nbi(), ts = this.s, ms = m.s;
    var nsh = this.DB - nbits(pm[pm.t - 1]);
    if (nsh > 0) {
      pm.lShiftTo(nsh, y);
      pt.lShiftTo(nsh, r);
    } else {
      pm.copyTo(y);
      pt.copyTo(r);
    }
    var ys = y.t;
    var y0 = y[ys - 1];
    if (y0 == 0) return;
    var yt = y0 * (1 << this.F1) + (ys > 1 ? y[ys - 2] >> this.F2 : 0);
    var d1 = this.FV / yt, d2 = (1 << this.F1) / yt, e = 1 << this.F2;
    var i = r.t, j = i - ys, t = q == null ? nbi() : q;
    y.dlShiftTo(j, t);
    if (r.compareTo(t) >= 0) {
      r[r.t++] = 1;
      r.subTo(t, r);
    }
    BigInteger.ONE.dlShiftTo(ys, t);
    t.subTo(y, y);
    while (y.t < ys) y[y.t++] = 0;
    while (--j >= 0) {
      var qd = r[--i] == y0 ? this.DM : Math.floor(r[i] * d1 + (r[i - 1] + e) * d2);
      if ((r[i] += y.am(0, qd, r, j, 0, ys)) < qd) {
        y.dlShiftTo(j, t);
        r.subTo(t, r);
        while (r[i] < --qd) r.subTo(t, r);
      }
    }
    if (q != null) {
      r.drShiftTo(ys, q);
      if (ts != ms) BigInteger.ZERO.subTo(q, q);
    }
    r.t = ys;
    r.clamp();
    if (nsh > 0) r.rShiftTo(nsh, r);
    if (ts < 0) BigInteger.ZERO.subTo(r, r);
  }
  function bnMod(a) {
    var r = nbi();
    this.abs().divRemTo(a, null, r);
    if (this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r, r);
    return r;
  }
  function Classic(m) {
    this.m = m;
  }
  function cConvert(x) {
    if (x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
    else return x;
  }
  function cRevert(x) {
    return x;
  }
  function cReduce(x) {
    x.divRemTo(this.m, null, x);
  }
  function cMulTo(x, y, r) {
    x.multiplyTo(y, r);
    this.reduce(r);
  }
  function cSqrTo(x, r) {
    x.squareTo(r);
    this.reduce(r);
  }
  Classic.prototype.convert = cConvert;
  Classic.prototype.revert = cRevert;
  Classic.prototype.reduce = cReduce;
  Classic.prototype.mulTo = cMulTo;
  Classic.prototype.sqrTo = cSqrTo;
  function bnpInvDigit() {
    if (this.t < 1) return 0;
    var x = this[0];
    if ((x & 1) == 0) return 0;
    var y = x & 3;
    y = y * (2 - (x & 15) * y) & 15;
    y = y * (2 - (x & 255) * y) & 255;
    y = y * (2 - ((x & 65535) * y & 65535)) & 65535;
    y = y * (2 - x * y % this.DV) % this.DV;
    return y > 0 ? this.DV - y : -y;
  }
  function Montgomery(m) {
    this.m = m;
    this.mp = m.invDigit();
    this.mpl = this.mp & 32767;
    this.mph = this.mp >> 15;
    this.um = (1 << m.DB - 15) - 1;
    this.mt2 = 2 * m.t;
  }
  function montConvert(x) {
    var r = nbi();
    x.abs().dlShiftTo(this.m.t, r);
    r.divRemTo(this.m, null, r);
    if (x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r, r);
    return r;
  }
  function montRevert(x) {
    var r = nbi();
    x.copyTo(r);
    this.reduce(r);
    return r;
  }
  function montReduce(x) {
    while (x.t <= this.mt2)
      x[x.t++] = 0;
    for (var i = 0; i < this.m.t; ++i) {
      var j = x[i] & 32767;
      var u0 = j * this.mpl + ((j * this.mph + (x[i] >> 15) * this.mpl & this.um) << 15) & x.DM;
      j = i + this.m.t;
      x[j] += this.m.am(0, u0, x, i, 0, this.m.t);
      while (x[j] >= x.DV) {
        x[j] -= x.DV;
        x[++j]++;
      }
    }
    x.clamp();
    x.drShiftTo(this.m.t, x);
    if (x.compareTo(this.m) >= 0) x.subTo(this.m, x);
  }
  function montSqrTo(x, r) {
    x.squareTo(r);
    this.reduce(r);
  }
  function montMulTo(x, y, r) {
    x.multiplyTo(y, r);
    this.reduce(r);
  }
  Montgomery.prototype.convert = montConvert;
  Montgomery.prototype.revert = montRevert;
  Montgomery.prototype.reduce = montReduce;
  Montgomery.prototype.mulTo = montMulTo;
  Montgomery.prototype.sqrTo = montSqrTo;
  function bnpIsEven() {
    return (this.t > 0 ? this[0] & 1 : this.s) == 0;
  }
  function bnpExp(e, z) {
    if (e > 4294967295 || e < 1) return BigInteger.ONE;
    var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e) - 1;
    g.copyTo(r);
    while (--i >= 0) {
      z.sqrTo(r, r2);
      if ((e & 1 << i) > 0) z.mulTo(r2, g, r);
      else {
        var t = r;
        r = r2;
        r2 = t;
      }
    }
    return z.revert(r);
  }
  function bnModPowInt(e, m) {
    var z;
    if (e < 256 || m.isEven()) z = new Classic(m);
    else z = new Montgomery(m);
    return this.exp(e, z);
  }
  BigInteger.prototype.copyTo = bnpCopyTo;
  BigInteger.prototype.fromInt = bnpFromInt;
  BigInteger.prototype.fromString = bnpFromString;
  BigInteger.prototype.clamp = bnpClamp;
  BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
  BigInteger.prototype.drShiftTo = bnpDRShiftTo;
  BigInteger.prototype.lShiftTo = bnpLShiftTo;
  BigInteger.prototype.rShiftTo = bnpRShiftTo;
  BigInteger.prototype.subTo = bnpSubTo;
  BigInteger.prototype.multiplyTo = bnpMultiplyTo;
  BigInteger.prototype.squareTo = bnpSquareTo;
  BigInteger.prototype.divRemTo = bnpDivRemTo;
  BigInteger.prototype.invDigit = bnpInvDigit;
  BigInteger.prototype.isEven = bnpIsEven;
  BigInteger.prototype.exp = bnpExp;
  BigInteger.prototype.toString = bnToString;
  BigInteger.prototype.negate = bnNegate;
  BigInteger.prototype.abs = bnAbs;
  BigInteger.prototype.compareTo = bnCompareTo;
  BigInteger.prototype.bitLength = bnBitLength;
  BigInteger.prototype.mod = bnMod;
  BigInteger.prototype.modPowInt = bnModPowInt;
  BigInteger.ZERO = nbv(0);
  BigInteger.ONE = nbv(1);
  function bnClone() {
    var r = nbi();
    this.copyTo(r);
    return r;
  }
  function bnIntValue() {
    if (this.s < 0) {
      if (this.t == 1) return this[0] - this.DV;
      else if (this.t == 0) return -1;
    } else if (this.t == 1) return this[0];
    else if (this.t == 0) return 0;
    return (this[1] & (1 << 32 - this.DB) - 1) << this.DB | this[0];
  }
  function bnByteValue() {
    return this.t == 0 ? this.s : this[0] << 24 >> 24;
  }
  function bnShortValue() {
    return this.t == 0 ? this.s : this[0] << 16 >> 16;
  }
  function bnpChunkSize(r) {
    return Math.floor(Math.LN2 * this.DB / Math.log(r));
  }
  function bnSigNum() {
    if (this.s < 0) return -1;
    else if (this.t <= 0 || this.t == 1 && this[0] <= 0) return 0;
    else return 1;
  }
  function bnpToRadix(b) {
    if (b == null) b = 10;
    if (this.signum() == 0 || b < 2 || b > 36) return "0";
    var cs = this.chunkSize(b);
    var a = Math.pow(b, cs);
    var d = nbv(a), y = nbi(), z = nbi(), r = "";
    this.divRemTo(d, y, z);
    while (y.signum() > 0) {
      r = (a + z.intValue()).toString(b).substr(1) + r;
      y.divRemTo(d, y, z);
    }
    return z.intValue().toString(b) + r;
  }
  function bnpFromRadix(s, b) {
    this.fromInt(0);
    if (b == null) b = 10;
    var cs = this.chunkSize(b);
    var d = Math.pow(b, cs), mi = false, j = 0, w = 0;
    for (var i = 0; i < s.length; ++i) {
      var x = intAt(s, i);
      if (x < 0) {
        if (s.charAt(i) == "-" && this.signum() == 0) mi = true;
        continue;
      }
      w = b * w + x;
      if (++j >= cs) {
        this.dMultiply(d);
        this.dAddOffset(w, 0);
        j = 0;
        w = 0;
      }
    }
    if (j > 0) {
      this.dMultiply(Math.pow(b, j));
      this.dAddOffset(w, 0);
    }
    if (mi) BigInteger.ZERO.subTo(this, this);
  }
  function bnpFromNumber(a, b, c) {
    if ("number" == typeof b) {
      if (a < 2) this.fromInt(1);
      else {
        this.fromNumber(a, c);
        if (!this.testBit(a - 1))
          this.bitwiseTo(BigInteger.ONE.shiftLeft(a - 1), op_or, this);
        if (this.isEven()) this.dAddOffset(1, 0);
        while (!this.isProbablePrime(b)) {
          this.dAddOffset(2, 0);
          if (this.bitLength() > a) this.subTo(BigInteger.ONE.shiftLeft(a - 1), this);
        }
      }
    } else {
      var x = new Array(), t = a & 7;
      x.length = (a >> 3) + 1;
      b.nextBytes(x);
      if (t > 0) x[0] &= (1 << t) - 1;
      else x[0] = 0;
      this.fromString(x, 256);
    }
  }
  function bnToByteArray() {
    var i = this.t, r = new Array();
    r[0] = this.s;
    var p = this.DB - i * this.DB % 8, d, k = 0;
    if (i-- > 0) {
      if (p < this.DB && (d = this[i] >> p) != (this.s & this.DM) >> p)
        r[k++] = d | this.s << this.DB - p;
      while (i >= 0) {
        if (p < 8) {
          d = (this[i] & (1 << p) - 1) << 8 - p;
          d |= this[--i] >> (p += this.DB - 8);
        } else {
          d = this[i] >> (p -= 8) & 255;
          if (p <= 0) {
            p += this.DB;
            --i;
          }
        }
        if ((d & 128) != 0) d |= -256;
        if (k == 0 && (this.s & 128) != (d & 128)) ++k;
        if (k > 0 || d != this.s) r[k++] = d;
      }
    }
    return r;
  }
  function bnEquals(a) {
    return this.compareTo(a) == 0;
  }
  function bnMin(a) {
    return this.compareTo(a) < 0 ? this : a;
  }
  function bnMax(a) {
    return this.compareTo(a) > 0 ? this : a;
  }
  function bnpBitwiseTo(a, op, r) {
    var i, f, m = Math.min(a.t, this.t);
    for (i = 0; i < m; ++i) r[i] = op(this[i], a[i]);
    if (a.t < this.t) {
      f = a.s & this.DM;
      for (i = m; i < this.t; ++i) r[i] = op(this[i], f);
      r.t = this.t;
    } else {
      f = this.s & this.DM;
      for (i = m; i < a.t; ++i) r[i] = op(f, a[i]);
      r.t = a.t;
    }
    r.s = op(this.s, a.s);
    r.clamp();
  }
  function op_and(x, y) {
    return x & y;
  }
  function bnAnd(a) {
    var r = nbi();
    this.bitwiseTo(a, op_and, r);
    return r;
  }
  function op_or(x, y) {
    return x | y;
  }
  function bnOr(a) {
    var r = nbi();
    this.bitwiseTo(a, op_or, r);
    return r;
  }
  function op_xor(x, y) {
    return x ^ y;
  }
  function bnXor(a) {
    var r = nbi();
    this.bitwiseTo(a, op_xor, r);
    return r;
  }
  function op_andnot(x, y) {
    return x & ~y;
  }
  function bnAndNot(a) {
    var r = nbi();
    this.bitwiseTo(a, op_andnot, r);
    return r;
  }
  function bnNot() {
    var r = nbi();
    for (var i = 0; i < this.t; ++i) r[i] = this.DM & ~this[i];
    r.t = this.t;
    r.s = ~this.s;
    return r;
  }
  function bnShiftLeft(n) {
    var r = nbi();
    if (n < 0) this.rShiftTo(-n, r);
    else this.lShiftTo(n, r);
    return r;
  }
  function bnShiftRight(n) {
    var r = nbi();
    if (n < 0) this.lShiftTo(-n, r);
    else this.rShiftTo(n, r);
    return r;
  }
  function lbit(x) {
    if (x == 0) return -1;
    var r = 0;
    if ((x & 65535) == 0) {
      x >>= 16;
      r += 16;
    }
    if ((x & 255) == 0) {
      x >>= 8;
      r += 8;
    }
    if ((x & 15) == 0) {
      x >>= 4;
      r += 4;
    }
    if ((x & 3) == 0) {
      x >>= 2;
      r += 2;
    }
    if ((x & 1) == 0) ++r;
    return r;
  }
  function bnGetLowestSetBit() {
    for (var i = 0; i < this.t; ++i)
      if (this[i] != 0) return i * this.DB + lbit(this[i]);
    if (this.s < 0) return this.t * this.DB;
    return -1;
  }
  function cbit(x) {
    var r = 0;
    while (x != 0) {
      x &= x - 1;
      ++r;
    }
    return r;
  }
  function bnBitCount() {
    var r = 0, x = this.s & this.DM;
    for (var i = 0; i < this.t; ++i) r += cbit(this[i] ^ x);
    return r;
  }
  function bnTestBit(n) {
    var j = Math.floor(n / this.DB);
    if (j >= this.t) return this.s != 0;
    return (this[j] & 1 << n % this.DB) != 0;
  }
  function bnpChangeBit(n, op) {
    var r = BigInteger.ONE.shiftLeft(n);
    this.bitwiseTo(r, op, r);
    return r;
  }
  function bnSetBit(n) {
    return this.changeBit(n, op_or);
  }
  function bnClearBit(n) {
    return this.changeBit(n, op_andnot);
  }
  function bnFlipBit(n) {
    return this.changeBit(n, op_xor);
  }
  function bnpAddTo(a, r) {
    var i = 0, c = 0, m = Math.min(a.t, this.t);
    while (i < m) {
      c += this[i] + a[i];
      r[i++] = c & this.DM;
      c >>= this.DB;
    }
    if (a.t < this.t) {
      c += a.s;
      while (i < this.t) {
        c += this[i];
        r[i++] = c & this.DM;
        c >>= this.DB;
      }
      c += this.s;
    } else {
      c += this.s;
      while (i < a.t) {
        c += a[i];
        r[i++] = c & this.DM;
        c >>= this.DB;
      }
      c += a.s;
    }
    r.s = c < 0 ? -1 : 0;
    if (c > 0) r[i++] = c;
    else if (c < -1) r[i++] = this.DV + c;
    r.t = i;
    r.clamp();
  }
  function bnAdd(a) {
    var r = nbi();
    this.addTo(a, r);
    return r;
  }
  function bnSubtract(a) {
    var r = nbi();
    this.subTo(a, r);
    return r;
  }
  function bnMultiply(a) {
    var r = nbi();
    this.multiplyTo(a, r);
    return r;
  }
  function bnSquare() {
    var r = nbi();
    this.squareTo(r);
    return r;
  }
  function bnDivide(a) {
    var r = nbi();
    this.divRemTo(a, r, null);
    return r;
  }
  function bnRemainder(a) {
    var r = nbi();
    this.divRemTo(a, null, r);
    return r;
  }
  function bnDivideAndRemainder(a) {
    var q = nbi(), r = nbi();
    this.divRemTo(a, q, r);
    return new Array(q, r);
  }
  function bnpDMultiply(n) {
    this[this.t] = this.am(0, n - 1, this, 0, 0, this.t);
    ++this.t;
    this.clamp();
  }
  function bnpDAddOffset(n, w) {
    if (n == 0) return;
    while (this.t <= w) this[this.t++] = 0;
    this[w] += n;
    while (this[w] >= this.DV) {
      this[w] -= this.DV;
      if (++w >= this.t) this[this.t++] = 0;
      ++this[w];
    }
  }
  function NullExp() {
  }
  function nNop(x) {
    return x;
  }
  function nMulTo(x, y, r) {
    x.multiplyTo(y, r);
  }
  function nSqrTo(x, r) {
    x.squareTo(r);
  }
  NullExp.prototype.convert = nNop;
  NullExp.prototype.revert = nNop;
  NullExp.prototype.mulTo = nMulTo;
  NullExp.prototype.sqrTo = nSqrTo;
  function bnPow(e) {
    return this.exp(e, new NullExp());
  }
  function bnpMultiplyLowerTo(a, n, r) {
    var i = Math.min(this.t + a.t, n);
    r.s = 0;
    r.t = i;
    while (i > 0) r[--i] = 0;
    var j;
    for (j = r.t - this.t; i < j; ++i) r[i + this.t] = this.am(0, a[i], r, i, 0, this.t);
    for (j = Math.min(a.t, n); i < j; ++i) this.am(0, a[i], r, i, 0, n - i);
    r.clamp();
  }
  function bnpMultiplyUpperTo(a, n, r) {
    --n;
    var i = r.t = this.t + a.t - n;
    r.s = 0;
    while (--i >= 0) r[i] = 0;
    for (i = Math.max(n - this.t, 0); i < a.t; ++i)
      r[this.t + i - n] = this.am(n - i, a[i], r, 0, 0, this.t + i - n);
    r.clamp();
    r.drShiftTo(1, r);
  }
  function Barrett(m) {
    this.r2 = nbi();
    this.q3 = nbi();
    BigInteger.ONE.dlShiftTo(2 * m.t, this.r2);
    this.mu = this.r2.divide(m);
    this.m = m;
  }
  function barrettConvert(x) {
    if (x.s < 0 || x.t > 2 * this.m.t) return x.mod(this.m);
    else if (x.compareTo(this.m) < 0) return x;
    else {
      var r = nbi();
      x.copyTo(r);
      this.reduce(r);
      return r;
    }
  }
  function barrettRevert(x) {
    return x;
  }
  function barrettReduce(x) {
    x.drShiftTo(this.m.t - 1, this.r2);
    if (x.t > this.m.t + 1) {
      x.t = this.m.t + 1;
      x.clamp();
    }
    this.mu.multiplyUpperTo(this.r2, this.m.t + 1, this.q3);
    this.m.multiplyLowerTo(this.q3, this.m.t + 1, this.r2);
    while (x.compareTo(this.r2) < 0) x.dAddOffset(1, this.m.t + 1);
    x.subTo(this.r2, x);
    while (x.compareTo(this.m) >= 0) x.subTo(this.m, x);
  }
  function barrettSqrTo(x, r) {
    x.squareTo(r);
    this.reduce(r);
  }
  function barrettMulTo(x, y, r) {
    x.multiplyTo(y, r);
    this.reduce(r);
  }
  Barrett.prototype.convert = barrettConvert;
  Barrett.prototype.revert = barrettRevert;
  Barrett.prototype.reduce = barrettReduce;
  Barrett.prototype.mulTo = barrettMulTo;
  Barrett.prototype.sqrTo = barrettSqrTo;
  function bnModPow(e, m) {
    var i = e.bitLength(), k, r = nbv(1), z;
    if (i <= 0) return r;
    else if (i < 18) k = 1;
    else if (i < 48) k = 3;
    else if (i < 144) k = 4;
    else if (i < 768) k = 5;
    else k = 6;
    if (i < 8)
      z = new Classic(m);
    else if (m.isEven())
      z = new Barrett(m);
    else
      z = new Montgomery(m);
    var g = new Array(), n = 3, k1 = k - 1, km = (1 << k) - 1;
    g[1] = z.convert(this);
    if (k > 1) {
      var g2 = nbi();
      z.sqrTo(g[1], g2);
      while (n <= km) {
        g[n] = nbi();
        z.mulTo(g2, g[n - 2], g[n]);
        n += 2;
      }
    }
    var j = e.t - 1, w, is1 = true, r2 = nbi(), t;
    i = nbits(e[j]) - 1;
    while (j >= 0) {
      if (i >= k1) w = e[j] >> i - k1 & km;
      else {
        w = (e[j] & (1 << i + 1) - 1) << k1 - i;
        if (j > 0) w |= e[j - 1] >> this.DB + i - k1;
      }
      n = k;
      while ((w & 1) == 0) {
        w >>= 1;
        --n;
      }
      if ((i -= n) < 0) {
        i += this.DB;
        --j;
      }
      if (is1) {
        g[w].copyTo(r);
        is1 = false;
      } else {
        while (n > 1) {
          z.sqrTo(r, r2);
          z.sqrTo(r2, r);
          n -= 2;
        }
        if (n > 0) z.sqrTo(r, r2);
        else {
          t = r;
          r = r2;
          r2 = t;
        }
        z.mulTo(r2, g[w], r);
      }
      while (j >= 0 && (e[j] & 1 << i) == 0) {
        z.sqrTo(r, r2);
        t = r;
        r = r2;
        r2 = t;
        if (--i < 0) {
          i = this.DB - 1;
          --j;
        }
      }
    }
    return z.revert(r);
  }
  function bnGCD(a) {
    var x = this.s < 0 ? this.negate() : this.clone();
    var y = a.s < 0 ? a.negate() : a.clone();
    if (x.compareTo(y) < 0) {
      var t = x;
      x = y;
      y = t;
    }
    var i = x.getLowestSetBit(), g = y.getLowestSetBit();
    if (g < 0) return x;
    if (i < g) g = i;
    if (g > 0) {
      x.rShiftTo(g, x);
      y.rShiftTo(g, y);
    }
    while (x.signum() > 0) {
      if ((i = x.getLowestSetBit()) > 0) x.rShiftTo(i, x);
      if ((i = y.getLowestSetBit()) > 0) y.rShiftTo(i, y);
      if (x.compareTo(y) >= 0) {
        x.subTo(y, x);
        x.rShiftTo(1, x);
      } else {
        y.subTo(x, y);
        y.rShiftTo(1, y);
      }
    }
    if (g > 0) y.lShiftTo(g, y);
    return y;
  }
  function bnpModInt(n) {
    if (n <= 0) return 0;
    var d = this.DV % n, r = this.s < 0 ? n - 1 : 0;
    if (this.t > 0)
      if (d == 0) r = this[0] % n;
      else
        for (var i = this.t - 1; i >= 0; --i) r = (d * r + this[i]) % n;
    return r;
  }
  function bnModInverse(m) {
    var ac = m.isEven();
    if (this.isEven() && ac || m.signum() == 0) return BigInteger.ZERO;
    var u = m.clone(), v = this.clone();
    var a = nbv(1), b = nbv(0), c = nbv(0), d = nbv(1);
    while (u.signum() != 0) {
      while (u.isEven()) {
        u.rShiftTo(1, u);
        if (ac) {
          if (!a.isEven() || !b.isEven()) {
            a.addTo(this, a);
            b.subTo(m, b);
          }
          a.rShiftTo(1, a);
        } else if (!b.isEven()) b.subTo(m, b);
        b.rShiftTo(1, b);
      }
      while (v.isEven()) {
        v.rShiftTo(1, v);
        if (ac) {
          if (!c.isEven() || !d.isEven()) {
            c.addTo(this, c);
            d.subTo(m, d);
          }
          c.rShiftTo(1, c);
        } else if (!d.isEven()) d.subTo(m, d);
        d.rShiftTo(1, d);
      }
      if (u.compareTo(v) >= 0) {
        u.subTo(v, u);
        if (ac) a.subTo(c, a);
        b.subTo(d, b);
      } else {
        v.subTo(u, v);
        if (ac) c.subTo(a, c);
        d.subTo(b, d);
      }
    }
    if (v.compareTo(BigInteger.ONE) != 0) return BigInteger.ZERO;
    if (d.compareTo(m) >= 0) return d.subtract(m);
    if (d.signum() < 0) d.addTo(m, d);
    else return d;
    if (d.signum() < 0) return d.add(m);
    else return d;
  }
  var lowprimes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509, 521, 523, 541, 547, 557, 563, 569, 571, 577, 587, 593, 599, 601, 607, 613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691, 701, 709, 719, 727, 733, 739, 743, 751, 757, 761, 769, 773, 787, 797, 809, 811, 821, 823, 827, 829, 839, 853, 857, 859, 863, 877, 881, 883, 887, 907, 911, 919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997];
  var lplim = (1 << 26) / lowprimes[lowprimes.length - 1];
  function bnIsProbablePrime(t) {
    var i, x = this.abs();
    if (x.t == 1 && x[0] <= lowprimes[lowprimes.length - 1]) {
      for (i = 0; i < lowprimes.length; ++i)
        if (x[0] == lowprimes[i]) return true;
      return false;
    }
    if (x.isEven()) return false;
    i = 1;
    while (i < lowprimes.length) {
      var m = lowprimes[i], j = i + 1;
      while (j < lowprimes.length && m < lplim) m *= lowprimes[j++];
      m = x.modInt(m);
      while (i < j)
        if (m % lowprimes[i++] == 0) return false;
    }
    return x.millerRabin(t);
  }
  function bnpMillerRabin(t) {
    var n1 = this.subtract(BigInteger.ONE);
    var k = n1.getLowestSetBit();
    if (k <= 0) return false;
    var r = n1.shiftRight(k);
    t = t + 1 >> 1;
    if (t > lowprimes.length) t = lowprimes.length;
    var a = nbi();
    for (var i = 0; i < t; ++i) {
      a.fromInt(lowprimes[Math.floor(Math.random() * lowprimes.length)]);
      var y = a.modPow(r, this);
      if (y.compareTo(BigInteger.ONE) != 0 && y.compareTo(n1) != 0) {
        var j = 1;
        while (j++ < k && y.compareTo(n1) != 0) {
          y = y.modPowInt(2, this);
          if (y.compareTo(BigInteger.ONE) == 0) return false;
        }
        if (y.compareTo(n1) != 0) return false;
      }
    }
    return true;
  }
  BigInteger.prototype.chunkSize = bnpChunkSize;
  BigInteger.prototype.toRadix = bnpToRadix;
  BigInteger.prototype.fromRadix = bnpFromRadix;
  BigInteger.prototype.fromNumber = bnpFromNumber;
  BigInteger.prototype.bitwiseTo = bnpBitwiseTo;
  BigInteger.prototype.changeBit = bnpChangeBit;
  BigInteger.prototype.addTo = bnpAddTo;
  BigInteger.prototype.dMultiply = bnpDMultiply;
  BigInteger.prototype.dAddOffset = bnpDAddOffset;
  BigInteger.prototype.multiplyLowerTo = bnpMultiplyLowerTo;
  BigInteger.prototype.multiplyUpperTo = bnpMultiplyUpperTo;
  BigInteger.prototype.modInt = bnpModInt;
  BigInteger.prototype.millerRabin = bnpMillerRabin;
  BigInteger.prototype.clone = bnClone;
  BigInteger.prototype.intValue = bnIntValue;
  BigInteger.prototype.byteValue = bnByteValue;
  BigInteger.prototype.shortValue = bnShortValue;
  BigInteger.prototype.signum = bnSigNum;
  BigInteger.prototype.toByteArray = bnToByteArray;
  BigInteger.prototype.equals = bnEquals;
  BigInteger.prototype.min = bnMin;
  BigInteger.prototype.max = bnMax;
  BigInteger.prototype.and = bnAnd;
  BigInteger.prototype.or = bnOr;
  BigInteger.prototype.xor = bnXor;
  BigInteger.prototype.andNot = bnAndNot;
  BigInteger.prototype.not = bnNot;
  BigInteger.prototype.shiftLeft = bnShiftLeft;
  BigInteger.prototype.shiftRight = bnShiftRight;
  BigInteger.prototype.getLowestSetBit = bnGetLowestSetBit;
  BigInteger.prototype.bitCount = bnBitCount;
  BigInteger.prototype.testBit = bnTestBit;
  BigInteger.prototype.setBit = bnSetBit;
  BigInteger.prototype.clearBit = bnClearBit;
  BigInteger.prototype.flipBit = bnFlipBit;
  BigInteger.prototype.add = bnAdd;
  BigInteger.prototype.subtract = bnSubtract;
  BigInteger.prototype.multiply = bnMultiply;
  BigInteger.prototype.divide = bnDivide;
  BigInteger.prototype.remainder = bnRemainder;
  BigInteger.prototype.divideAndRemainder = bnDivideAndRemainder;
  BigInteger.prototype.modPow = bnModPow;
  BigInteger.prototype.modInverse = bnModInverse;
  BigInteger.prototype.pow = bnPow;
  BigInteger.prototype.gcd = bnGCD;
  BigInteger.prototype.isProbablePrime = bnIsProbablePrime;
  BigInteger.prototype.square = bnSquare;
  var Int128 = BigInteger;
  Int128.prototype.IsNegative = function() {
    if (this.compareTo(Int128.ZERO) == -1) return true;
    else return false;
  };
  Int128.op_Equality = function(val1, val2) {
    if (val1.compareTo(val2) == 0) return true;
    else return false;
  };
  Int128.op_Inequality = function(val1, val2) {
    if (val1.compareTo(val2) != 0) return true;
    else return false;
  };
  Int128.op_GreaterThan = function(val1, val2) {
    if (val1.compareTo(val2) > 0) return true;
    else return false;
  };
  Int128.op_LessThan = function(val1, val2) {
    if (val1.compareTo(val2) < 0) return true;
    else return false;
  };
  Int128.op_Addition = function(lhs, rhs) {
    return new Int128(lhs, void 0, void 0).add(new Int128(rhs, void 0, void 0));
  };
  Int128.op_Subtraction = function(lhs, rhs) {
    return new Int128(lhs, void 0, void 0).subtract(new Int128(rhs, void 0, void 0));
  };
  Int128.Int128Mul = function(lhs, rhs) {
    return new Int128(lhs, void 0, void 0).multiply(new Int128(rhs, void 0, void 0));
  };
  Int128.op_Division = function(lhs, rhs) {
    return lhs.divide(rhs);
  };
  Int128.prototype.ToDouble = function() {
    return parseFloat(this.toString());
  };
  var Inherit = function(ce, ce2) {
    var p;
    if (typeof Object.getOwnPropertyNames === "undefined") {
      for (p in ce2.prototype)
        if (typeof ce.prototype[p] === "undefined" || ce.prototype[p] === Object.prototype[p]) ce.prototype[p] = ce2.prototype[p];
      for (p in ce2)
        if (typeof ce[p] === "undefined") ce[p] = ce2[p];
      ce.$baseCtor = ce2;
    } else {
      var props = Object.getOwnPropertyNames(ce2.prototype);
      for (var i = 0; i < props.length; i++)
        if (typeof Object.getOwnPropertyDescriptor(ce.prototype, props[i]) === "undefined") Object.defineProperty(ce.prototype, props[i], Object.getOwnPropertyDescriptor(ce2.prototype, props[i]));
      for (p in ce2)
        if (typeof ce[p] === "undefined") ce[p] = ce2[p];
      ce.$baseCtor = ce2;
    }
  };
  ClipperLib2.Path = function() {
    return [];
  };
  ClipperLib2.Path.prototype.push = Array.prototype.push;
  ClipperLib2.Paths = function() {
    return [];
  };
  ClipperLib2.Paths.prototype.push = Array.prototype.push;
  ClipperLib2.DoublePoint = function() {
    var a = arguments;
    this.X = 0;
    this.Y = 0;
    if (a.length === 1) {
      this.X = a[0].X;
      this.Y = a[0].Y;
    } else if (a.length === 2) {
      this.X = a[0];
      this.Y = a[1];
    }
  };
  ClipperLib2.DoublePoint0 = function() {
    this.X = 0;
    this.Y = 0;
  };
  ClipperLib2.DoublePoint0.prototype = ClipperLib2.DoublePoint.prototype;
  ClipperLib2.DoublePoint1 = function(dp) {
    this.X = dp.X;
    this.Y = dp.Y;
  };
  ClipperLib2.DoublePoint1.prototype = ClipperLib2.DoublePoint.prototype;
  ClipperLib2.DoublePoint2 = function(x, y) {
    this.X = x;
    this.Y = y;
  };
  ClipperLib2.DoublePoint2.prototype = ClipperLib2.DoublePoint.prototype;
  ClipperLib2.PolyNode = function() {
    this.m_Parent = null;
    this.m_polygon = new ClipperLib2.Path();
    this.m_Index = 0;
    this.m_jointype = 0;
    this.m_endtype = 0;
    this.m_Childs = [];
    this.IsOpen = false;
  };
  ClipperLib2.PolyNode.prototype.IsHoleNode = function() {
    var result = true;
    var node = this.m_Parent;
    while (node !== null) {
      result = !result;
      node = node.m_Parent;
    }
    return result;
  };
  ClipperLib2.PolyNode.prototype.ChildCount = function() {
    return this.m_Childs.length;
  };
  ClipperLib2.PolyNode.prototype.Contour = function() {
    return this.m_polygon;
  };
  ClipperLib2.PolyNode.prototype.AddChild = function(Child) {
    var cnt = this.m_Childs.length;
    this.m_Childs.push(Child);
    Child.m_Parent = this;
    Child.m_Index = cnt;
  };
  ClipperLib2.PolyNode.prototype.GetNext = function() {
    if (this.m_Childs.length > 0)
      return this.m_Childs[0];
    else
      return this.GetNextSiblingUp();
  };
  ClipperLib2.PolyNode.prototype.GetNextSiblingUp = function() {
    if (this.m_Parent === null)
      return null;
    else if (this.m_Index === this.m_Parent.m_Childs.length - 1)
      return this.m_Parent.GetNextSiblingUp();
    else
      return this.m_Parent.m_Childs[this.m_Index + 1];
  };
  ClipperLib2.PolyNode.prototype.Childs = function() {
    return this.m_Childs;
  };
  ClipperLib2.PolyNode.prototype.Parent = function() {
    return this.m_Parent;
  };
  ClipperLib2.PolyNode.prototype.IsHole = function() {
    return this.IsHoleNode();
  };
  ClipperLib2.PolyTree = function() {
    this.m_AllPolys = [];
    ClipperLib2.PolyNode.call(this);
  };
  ClipperLib2.PolyTree.prototype.Clear = function() {
    for (var i = 0, ilen = this.m_AllPolys.length; i < ilen; i++)
      this.m_AllPolys[i] = null;
    this.m_AllPolys.length = 0;
    this.m_Childs.length = 0;
  };
  ClipperLib2.PolyTree.prototype.GetFirst = function() {
    if (this.m_Childs.length > 0)
      return this.m_Childs[0];
    else
      return null;
  };
  ClipperLib2.PolyTree.prototype.Total = function() {
    var result = this.m_AllPolys.length;
    if (result > 0 && this.m_Childs[0] !== this.m_AllPolys[0]) result--;
    return result;
  };
  Inherit(ClipperLib2.PolyTree, ClipperLib2.PolyNode);
  ClipperLib2.Math_Abs_Int64 = ClipperLib2.Math_Abs_Int32 = ClipperLib2.Math_Abs_Double = function(a) {
    return Math.abs(a);
  };
  ClipperLib2.Math_Max_Int32_Int32 = function(a, b) {
    return Math.max(a, b);
  };
  if (browser.msie || browser.opera || browser.safari) ClipperLib2.Cast_Int32 = function(a) {
    return a | 0;
  };
  else ClipperLib2.Cast_Int32 = function(a) {
    return ~~a;
  };
  if (typeof Number.toInteger === "undefined")
    Number.toInteger = null;
  if (browser.chrome) ClipperLib2.Cast_Int64 = function(a) {
    if (a < -2147483648 || a > 2147483647)
      return a < 0 ? Math.ceil(a) : Math.floor(a);
    else return ~~a;
  };
  else if (browser.firefox && typeof Number.toInteger === "function") ClipperLib2.Cast_Int64 = function(a) {
    return Number.toInteger(a);
  };
  else if (browser.msie7 || browser.msie8) ClipperLib2.Cast_Int64 = function(a) {
    return parseInt(a, 10);
  };
  else if (browser.msie) ClipperLib2.Cast_Int64 = function(a) {
    if (a < -2147483648 || a > 2147483647)
      return a < 0 ? Math.ceil(a) : Math.floor(a);
    return a | 0;
  };
  else ClipperLib2.Cast_Int64 = function(a) {
    return a < 0 ? Math.ceil(a) : Math.floor(a);
  };
  ClipperLib2.Clear = function(a) {
    a.length = 0;
  };
  ClipperLib2.PI = 3.141592653589793;
  ClipperLib2.PI2 = 2 * 3.141592653589793;
  ClipperLib2.IntPoint = function() {
    var a = arguments, alen = a.length;
    this.X = 0;
    this.Y = 0;
    if (ClipperLib2.use_xyz) {
      this.Z = 0;
      if (alen === 3) {
        this.X = a[0];
        this.Y = a[1];
        this.Z = a[2];
      } else if (alen === 2) {
        this.X = a[0];
        this.Y = a[1];
        this.Z = 0;
      } else if (alen === 1) {
        if (a[0] instanceof ClipperLib2.DoublePoint) {
          var dp = a[0];
          this.X = ClipperLib2.Clipper.Round(dp.X);
          this.Y = ClipperLib2.Clipper.Round(dp.Y);
          this.Z = 0;
        } else {
          var pt = a[0];
          if (typeof pt.Z === "undefined") pt.Z = 0;
          this.X = pt.X;
          this.Y = pt.Y;
          this.Z = pt.Z;
        }
      } else {
        this.X = 0;
        this.Y = 0;
        this.Z = 0;
      }
    } else {
      if (alen === 2) {
        this.X = a[0];
        this.Y = a[1];
      } else if (alen === 1) {
        if (a[0] instanceof ClipperLib2.DoublePoint) {
          var dp = a[0];
          this.X = ClipperLib2.Clipper.Round(dp.X);
          this.Y = ClipperLib2.Clipper.Round(dp.Y);
        } else {
          var pt = a[0];
          this.X = pt.X;
          this.Y = pt.Y;
        }
      } else {
        this.X = 0;
        this.Y = 0;
      }
    }
  };
  ClipperLib2.IntPoint.op_Equality = function(a, b) {
    return a.X === b.X && a.Y === b.Y;
  };
  ClipperLib2.IntPoint.op_Inequality = function(a, b) {
    return a.X !== b.X || a.Y !== b.Y;
  };
  ClipperLib2.IntPoint0 = function() {
    this.X = 0;
    this.Y = 0;
    if (ClipperLib2.use_xyz)
      this.Z = 0;
  };
  ClipperLib2.IntPoint0.prototype = ClipperLib2.IntPoint.prototype;
  ClipperLib2.IntPoint1 = function(pt) {
    this.X = pt.X;
    this.Y = pt.Y;
    if (ClipperLib2.use_xyz) {
      if (typeof pt.Z === "undefined") this.Z = 0;
      else this.Z = pt.Z;
    }
  };
  ClipperLib2.IntPoint1.prototype = ClipperLib2.IntPoint.prototype;
  ClipperLib2.IntPoint1dp = function(dp) {
    this.X = ClipperLib2.Clipper.Round(dp.X);
    this.Y = ClipperLib2.Clipper.Round(dp.Y);
    if (ClipperLib2.use_xyz)
      this.Z = 0;
  };
  ClipperLib2.IntPoint1dp.prototype = ClipperLib2.IntPoint.prototype;
  ClipperLib2.IntPoint2 = function(x, y, z) {
    this.X = x;
    this.Y = y;
    if (ClipperLib2.use_xyz) {
      if (typeof z === "undefined") this.Z = 0;
      else this.Z = z;
    }
  };
  ClipperLib2.IntPoint2.prototype = ClipperLib2.IntPoint.prototype;
  ClipperLib2.IntRect = function() {
    var a = arguments, alen = a.length;
    if (alen === 4) {
      this.left = a[0];
      this.top = a[1];
      this.right = a[2];
      this.bottom = a[3];
    } else if (alen === 1) {
      var ir = a[0];
      this.left = ir.left;
      this.top = ir.top;
      this.right = ir.right;
      this.bottom = ir.bottom;
    } else {
      this.left = 0;
      this.top = 0;
      this.right = 0;
      this.bottom = 0;
    }
  };
  ClipperLib2.IntRect0 = function() {
    this.left = 0;
    this.top = 0;
    this.right = 0;
    this.bottom = 0;
  };
  ClipperLib2.IntRect0.prototype = ClipperLib2.IntRect.prototype;
  ClipperLib2.IntRect1 = function(ir) {
    this.left = ir.left;
    this.top = ir.top;
    this.right = ir.right;
    this.bottom = ir.bottom;
  };
  ClipperLib2.IntRect1.prototype = ClipperLib2.IntRect.prototype;
  ClipperLib2.IntRect4 = function(l, t, r, b) {
    this.left = l;
    this.top = t;
    this.right = r;
    this.bottom = b;
  };
  ClipperLib2.IntRect4.prototype = ClipperLib2.IntRect.prototype;
  ClipperLib2.ClipType = {
    ctIntersection: 0,
    ctUnion: 1,
    ctDifference: 2,
    ctXor: 3
  };
  ClipperLib2.PolyType = {
    ptSubject: 0,
    ptClip: 1
  };
  ClipperLib2.PolyFillType = {
    pftEvenOdd: 0,
    pftNonZero: 1,
    pftPositive: 2,
    pftNegative: 3
  };
  ClipperLib2.JoinType = {
    jtSquare: 0,
    jtRound: 1,
    jtMiter: 2
  };
  ClipperLib2.EndType = {
    etOpenSquare: 0,
    etOpenRound: 1,
    etOpenButt: 2,
    etClosedLine: 3,
    etClosedPolygon: 4
  };
  ClipperLib2.EdgeSide = {
    esLeft: 0,
    esRight: 1
  };
  ClipperLib2.Direction = {
    dRightToLeft: 0,
    dLeftToRight: 1
  };
  ClipperLib2.TEdge = function() {
    this.Bot = new ClipperLib2.IntPoint0();
    this.Curr = new ClipperLib2.IntPoint0();
    this.Top = new ClipperLib2.IntPoint0();
    this.Delta = new ClipperLib2.IntPoint0();
    this.Dx = 0;
    this.PolyTyp = ClipperLib2.PolyType.ptSubject;
    this.Side = ClipperLib2.EdgeSide.esLeft;
    this.WindDelta = 0;
    this.WindCnt = 0;
    this.WindCnt2 = 0;
    this.OutIdx = 0;
    this.Next = null;
    this.Prev = null;
    this.NextInLML = null;
    this.NextInAEL = null;
    this.PrevInAEL = null;
    this.NextInSEL = null;
    this.PrevInSEL = null;
  };
  ClipperLib2.IntersectNode = function() {
    this.Edge1 = null;
    this.Edge2 = null;
    this.Pt = new ClipperLib2.IntPoint0();
  };
  ClipperLib2.MyIntersectNodeSort = function() {
  };
  ClipperLib2.MyIntersectNodeSort.Compare = function(node1, node2) {
    var i = node2.Pt.Y - node1.Pt.Y;
    if (i > 0) return 1;
    else if (i < 0) return -1;
    else return 0;
  };
  ClipperLib2.LocalMinima = function() {
    this.Y = 0;
    this.LeftBound = null;
    this.RightBound = null;
    this.Next = null;
  };
  ClipperLib2.Scanbeam = function() {
    this.Y = 0;
    this.Next = null;
  };
  ClipperLib2.Maxima = function() {
    this.X = 0;
    this.Next = null;
    this.Prev = null;
  };
  ClipperLib2.OutRec = function() {
    this.Idx = 0;
    this.IsHole = false;
    this.IsOpen = false;
    this.FirstLeft = null;
    this.Pts = null;
    this.BottomPt = null;
    this.PolyNode = null;
  };
  ClipperLib2.OutPt = function() {
    this.Idx = 0;
    this.Pt = new ClipperLib2.IntPoint0();
    this.Next = null;
    this.Prev = null;
  };
  ClipperLib2.Join = function() {
    this.OutPt1 = null;
    this.OutPt2 = null;
    this.OffPt = new ClipperLib2.IntPoint0();
  };
  ClipperLib2.ClipperBase = function() {
    this.m_MinimaList = null;
    this.m_CurrentLM = null;
    this.m_edges = new Array();
    this.m_UseFullRange = false;
    this.m_HasOpenPaths = false;
    this.PreserveCollinear = false;
    this.m_Scanbeam = null;
    this.m_PolyOuts = null;
    this.m_ActiveEdges = null;
  };
  ClipperLib2.ClipperBase.horizontal = -9007199254740992;
  ClipperLib2.ClipperBase.Skip = -2;
  ClipperLib2.ClipperBase.Unassigned = -1;
  ClipperLib2.ClipperBase.tolerance = 1e-20;
  ClipperLib2.ClipperBase.loRange = 47453132;
  ClipperLib2.ClipperBase.hiRange = 4503599627370495;
  ClipperLib2.ClipperBase.near_zero = function(val) {
    return val > -ClipperLib2.ClipperBase.tolerance && val < ClipperLib2.ClipperBase.tolerance;
  };
  ClipperLib2.ClipperBase.IsHorizontal = function(e) {
    return e.Delta.Y === 0;
  };
  ClipperLib2.ClipperBase.prototype.PointIsVertex = function(pt, pp) {
    var pp2 = pp;
    do {
      if (ClipperLib2.IntPoint.op_Equality(pp2.Pt, pt))
        return true;
      pp2 = pp2.Next;
    } while (pp2 !== pp);
    return false;
  };
  ClipperLib2.ClipperBase.prototype.PointOnLineSegment = function(pt, linePt1, linePt2, UseFullRange) {
    if (UseFullRange)
      return pt.X === linePt1.X && pt.Y === linePt1.Y || pt.X === linePt2.X && pt.Y === linePt2.Y || pt.X > linePt1.X === pt.X < linePt2.X && pt.Y > linePt1.Y === pt.Y < linePt2.Y && Int128.op_Equality(
        Int128.Int128Mul(pt.X - linePt1.X, linePt2.Y - linePt1.Y),
        Int128.Int128Mul(linePt2.X - linePt1.X, pt.Y - linePt1.Y)
      );
    else
      return pt.X === linePt1.X && pt.Y === linePt1.Y || pt.X === linePt2.X && pt.Y === linePt2.Y || pt.X > linePt1.X === pt.X < linePt2.X && pt.Y > linePt1.Y === pt.Y < linePt2.Y && (pt.X - linePt1.X) * (linePt2.Y - linePt1.Y) === (linePt2.X - linePt1.X) * (pt.Y - linePt1.Y);
  };
  ClipperLib2.ClipperBase.prototype.PointOnPolygon = function(pt, pp, UseFullRange) {
    var pp2 = pp;
    while (true) {
      if (this.PointOnLineSegment(pt, pp2.Pt, pp2.Next.Pt, UseFullRange))
        return true;
      pp2 = pp2.Next;
      if (pp2 === pp)
        break;
    }
    return false;
  };
  ClipperLib2.ClipperBase.prototype.SlopesEqual = ClipperLib2.ClipperBase.SlopesEqual = function() {
    var a = arguments, alen = a.length;
    var e1, e2, pt1, pt2, pt3, pt4, UseFullRange;
    if (alen === 3) {
      e1 = a[0];
      e2 = a[1];
      UseFullRange = a[2];
      if (UseFullRange)
        return Int128.op_Equality(Int128.Int128Mul(e1.Delta.Y, e2.Delta.X), Int128.Int128Mul(e1.Delta.X, e2.Delta.Y));
      else
        return ClipperLib2.Cast_Int64(e1.Delta.Y * e2.Delta.X) === ClipperLib2.Cast_Int64(e1.Delta.X * e2.Delta.Y);
    } else if (alen === 4) {
      pt1 = a[0];
      pt2 = a[1];
      pt3 = a[2];
      UseFullRange = a[3];
      if (UseFullRange)
        return Int128.op_Equality(Int128.Int128Mul(pt1.Y - pt2.Y, pt2.X - pt3.X), Int128.Int128Mul(pt1.X - pt2.X, pt2.Y - pt3.Y));
      else
        return ClipperLib2.Cast_Int64((pt1.Y - pt2.Y) * (pt2.X - pt3.X)) - ClipperLib2.Cast_Int64((pt1.X - pt2.X) * (pt2.Y - pt3.Y)) === 0;
    } else {
      pt1 = a[0];
      pt2 = a[1];
      pt3 = a[2];
      pt4 = a[3];
      UseFullRange = a[4];
      if (UseFullRange)
        return Int128.op_Equality(Int128.Int128Mul(pt1.Y - pt2.Y, pt3.X - pt4.X), Int128.Int128Mul(pt1.X - pt2.X, pt3.Y - pt4.Y));
      else
        return ClipperLib2.Cast_Int64((pt1.Y - pt2.Y) * (pt3.X - pt4.X)) - ClipperLib2.Cast_Int64((pt1.X - pt2.X) * (pt3.Y - pt4.Y)) === 0;
    }
  };
  ClipperLib2.ClipperBase.SlopesEqual3 = function(e1, e2, UseFullRange) {
    if (UseFullRange)
      return Int128.op_Equality(Int128.Int128Mul(e1.Delta.Y, e2.Delta.X), Int128.Int128Mul(e1.Delta.X, e2.Delta.Y));
    else
      return ClipperLib2.Cast_Int64(e1.Delta.Y * e2.Delta.X) === ClipperLib2.Cast_Int64(e1.Delta.X * e2.Delta.Y);
  };
  ClipperLib2.ClipperBase.SlopesEqual4 = function(pt1, pt2, pt3, UseFullRange) {
    if (UseFullRange)
      return Int128.op_Equality(Int128.Int128Mul(pt1.Y - pt2.Y, pt2.X - pt3.X), Int128.Int128Mul(pt1.X - pt2.X, pt2.Y - pt3.Y));
    else
      return ClipperLib2.Cast_Int64((pt1.Y - pt2.Y) * (pt2.X - pt3.X)) - ClipperLib2.Cast_Int64((pt1.X - pt2.X) * (pt2.Y - pt3.Y)) === 0;
  };
  ClipperLib2.ClipperBase.SlopesEqual5 = function(pt1, pt2, pt3, pt4, UseFullRange) {
    if (UseFullRange)
      return Int128.op_Equality(Int128.Int128Mul(pt1.Y - pt2.Y, pt3.X - pt4.X), Int128.Int128Mul(pt1.X - pt2.X, pt3.Y - pt4.Y));
    else
      return ClipperLib2.Cast_Int64((pt1.Y - pt2.Y) * (pt3.X - pt4.X)) - ClipperLib2.Cast_Int64((pt1.X - pt2.X) * (pt3.Y - pt4.Y)) === 0;
  };
  ClipperLib2.ClipperBase.prototype.Clear = function() {
    this.DisposeLocalMinimaList();
    for (var i = 0, ilen = this.m_edges.length; i < ilen; ++i) {
      for (var j = 0, jlen = this.m_edges[i].length; j < jlen; ++j)
        this.m_edges[i][j] = null;
      ClipperLib2.Clear(this.m_edges[i]);
    }
    ClipperLib2.Clear(this.m_edges);
    this.m_UseFullRange = false;
    this.m_HasOpenPaths = false;
  };
  ClipperLib2.ClipperBase.prototype.DisposeLocalMinimaList = function() {
    while (this.m_MinimaList !== null) {
      var tmpLm = this.m_MinimaList.Next;
      this.m_MinimaList = null;
      this.m_MinimaList = tmpLm;
    }
    this.m_CurrentLM = null;
  };
  ClipperLib2.ClipperBase.prototype.RangeTest = function(Pt, useFullRange) {
    if (useFullRange.Value) {
      if (Pt.X > ClipperLib2.ClipperBase.hiRange || Pt.Y > ClipperLib2.ClipperBase.hiRange || -Pt.X > ClipperLib2.ClipperBase.hiRange || -Pt.Y > ClipperLib2.ClipperBase.hiRange)
        ClipperLib2.Error("Coordinate outside allowed range in RangeTest().");
    } else if (Pt.X > ClipperLib2.ClipperBase.loRange || Pt.Y > ClipperLib2.ClipperBase.loRange || -Pt.X > ClipperLib2.ClipperBase.loRange || -Pt.Y > ClipperLib2.ClipperBase.loRange) {
      useFullRange.Value = true;
      this.RangeTest(Pt, useFullRange);
    }
  };
  ClipperLib2.ClipperBase.prototype.InitEdge = function(e, eNext, ePrev, pt) {
    e.Next = eNext;
    e.Prev = ePrev;
    e.Curr.X = pt.X;
    e.Curr.Y = pt.Y;
    if (ClipperLib2.use_xyz) e.Curr.Z = pt.Z;
    e.OutIdx = -1;
  };
  ClipperLib2.ClipperBase.prototype.InitEdge2 = function(e, polyType) {
    if (e.Curr.Y >= e.Next.Curr.Y) {
      e.Bot.X = e.Curr.X;
      e.Bot.Y = e.Curr.Y;
      if (ClipperLib2.use_xyz) e.Bot.Z = e.Curr.Z;
      e.Top.X = e.Next.Curr.X;
      e.Top.Y = e.Next.Curr.Y;
      if (ClipperLib2.use_xyz) e.Top.Z = e.Next.Curr.Z;
    } else {
      e.Top.X = e.Curr.X;
      e.Top.Y = e.Curr.Y;
      if (ClipperLib2.use_xyz) e.Top.Z = e.Curr.Z;
      e.Bot.X = e.Next.Curr.X;
      e.Bot.Y = e.Next.Curr.Y;
      if (ClipperLib2.use_xyz) e.Bot.Z = e.Next.Curr.Z;
    }
    this.SetDx(e);
    e.PolyTyp = polyType;
  };
  ClipperLib2.ClipperBase.prototype.FindNextLocMin = function(E) {
    var E2;
    for (; ; ) {
      while (ClipperLib2.IntPoint.op_Inequality(E.Bot, E.Prev.Bot) || ClipperLib2.IntPoint.op_Equality(E.Curr, E.Top))
        E = E.Next;
      if (E.Dx !== ClipperLib2.ClipperBase.horizontal && E.Prev.Dx !== ClipperLib2.ClipperBase.horizontal)
        break;
      while (E.Prev.Dx === ClipperLib2.ClipperBase.horizontal)
        E = E.Prev;
      E2 = E;
      while (E.Dx === ClipperLib2.ClipperBase.horizontal)
        E = E.Next;
      if (E.Top.Y === E.Prev.Bot.Y)
        continue;
      if (E2.Prev.Bot.X < E.Bot.X)
        E = E2;
      break;
    }
    return E;
  };
  ClipperLib2.ClipperBase.prototype.ProcessBound = function(E, LeftBoundIsForward) {
    var EStart;
    var Result = E;
    var Horz;
    if (Result.OutIdx === ClipperLib2.ClipperBase.Skip) {
      E = Result;
      if (LeftBoundIsForward) {
        while (E.Top.Y === E.Next.Bot.Y) E = E.Next;
        while (E !== Result && E.Dx === ClipperLib2.ClipperBase.horizontal) E = E.Prev;
      } else {
        while (E.Top.Y === E.Prev.Bot.Y) E = E.Prev;
        while (E !== Result && E.Dx === ClipperLib2.ClipperBase.horizontal) E = E.Next;
      }
      if (E === Result) {
        if (LeftBoundIsForward) Result = E.Next;
        else Result = E.Prev;
      } else {
        if (LeftBoundIsForward)
          E = Result.Next;
        else
          E = Result.Prev;
        var locMin = new ClipperLib2.LocalMinima();
        locMin.Next = null;
        locMin.Y = E.Bot.Y;
        locMin.LeftBound = null;
        locMin.RightBound = E;
        E.WindDelta = 0;
        Result = this.ProcessBound(E, LeftBoundIsForward);
        this.InsertLocalMinima(locMin);
      }
      return Result;
    }
    if (E.Dx === ClipperLib2.ClipperBase.horizontal) {
      if (LeftBoundIsForward) EStart = E.Prev;
      else EStart = E.Next;
      if (EStart.Dx === ClipperLib2.ClipperBase.horizontal) {
        if (EStart.Bot.X !== E.Bot.X && EStart.Top.X !== E.Bot.X)
          this.ReverseHorizontal(E);
      } else if (EStart.Bot.X !== E.Bot.X)
        this.ReverseHorizontal(E);
    }
    EStart = E;
    if (LeftBoundIsForward) {
      while (Result.Top.Y === Result.Next.Bot.Y && Result.Next.OutIdx !== ClipperLib2.ClipperBase.Skip)
        Result = Result.Next;
      if (Result.Dx === ClipperLib2.ClipperBase.horizontal && Result.Next.OutIdx !== ClipperLib2.ClipperBase.Skip) {
        Horz = Result;
        while (Horz.Prev.Dx === ClipperLib2.ClipperBase.horizontal)
          Horz = Horz.Prev;
        if (Horz.Prev.Top.X > Result.Next.Top.X)
          Result = Horz.Prev;
      }
      while (E !== Result) {
        E.NextInLML = E.Next;
        if (E.Dx === ClipperLib2.ClipperBase.horizontal && E !== EStart && E.Bot.X !== E.Prev.Top.X)
          this.ReverseHorizontal(E);
        E = E.Next;
      }
      if (E.Dx === ClipperLib2.ClipperBase.horizontal && E !== EStart && E.Bot.X !== E.Prev.Top.X)
        this.ReverseHorizontal(E);
      Result = Result.Next;
    } else {
      while (Result.Top.Y === Result.Prev.Bot.Y && Result.Prev.OutIdx !== ClipperLib2.ClipperBase.Skip)
        Result = Result.Prev;
      if (Result.Dx === ClipperLib2.ClipperBase.horizontal && Result.Prev.OutIdx !== ClipperLib2.ClipperBase.Skip) {
        Horz = Result;
        while (Horz.Next.Dx === ClipperLib2.ClipperBase.horizontal)
          Horz = Horz.Next;
        if (Horz.Next.Top.X === Result.Prev.Top.X || Horz.Next.Top.X > Result.Prev.Top.X) {
          Result = Horz.Next;
        }
      }
      while (E !== Result) {
        E.NextInLML = E.Prev;
        if (E.Dx === ClipperLib2.ClipperBase.horizontal && E !== EStart && E.Bot.X !== E.Next.Top.X)
          this.ReverseHorizontal(E);
        E = E.Prev;
      }
      if (E.Dx === ClipperLib2.ClipperBase.horizontal && E !== EStart && E.Bot.X !== E.Next.Top.X)
        this.ReverseHorizontal(E);
      Result = Result.Prev;
    }
    return Result;
  };
  ClipperLib2.ClipperBase.prototype.AddPath = function(pg, polyType, Closed) {
    if (ClipperLib2.use_lines) {
      if (!Closed && polyType === ClipperLib2.PolyType.ptClip)
        ClipperLib2.Error("AddPath: Open paths must be subject.");
    } else {
      if (!Closed)
        ClipperLib2.Error("AddPath: Open paths have been disabled.");
    }
    var highI = pg.length - 1;
    if (Closed)
      while (highI > 0 && ClipperLib2.IntPoint.op_Equality(pg[highI], pg[0]))
        --highI;
    while (highI > 0 && ClipperLib2.IntPoint.op_Equality(pg[highI], pg[highI - 1]))
      --highI;
    if (Closed && highI < 2 || !Closed && highI < 1)
      return false;
    var edges = new Array();
    for (var i = 0; i <= highI; i++)
      edges.push(new ClipperLib2.TEdge());
    var IsFlat = true;
    edges[1].Curr.X = pg[1].X;
    edges[1].Curr.Y = pg[1].Y;
    if (ClipperLib2.use_xyz) edges[1].Curr.Z = pg[1].Z;
    var $1 = {
      Value: this.m_UseFullRange
    };
    this.RangeTest(pg[0], $1);
    this.m_UseFullRange = $1.Value;
    $1.Value = this.m_UseFullRange;
    this.RangeTest(pg[highI], $1);
    this.m_UseFullRange = $1.Value;
    this.InitEdge(edges[0], edges[1], edges[highI], pg[0]);
    this.InitEdge(edges[highI], edges[0], edges[highI - 1], pg[highI]);
    for (var i = highI - 1; i >= 1; --i) {
      $1.Value = this.m_UseFullRange;
      this.RangeTest(pg[i], $1);
      this.m_UseFullRange = $1.Value;
      this.InitEdge(edges[i], edges[i + 1], edges[i - 1], pg[i]);
    }
    var eStart = edges[0];
    var E = eStart, eLoopStop = eStart;
    for (; ; ) {
      if (E.Curr === E.Next.Curr && (Closed || E.Next !== eStart)) {
        if (E === E.Next)
          break;
        if (E === eStart)
          eStart = E.Next;
        E = this.RemoveEdge(E);
        eLoopStop = E;
        continue;
      }
      if (E.Prev === E.Next)
        break;
      else if (Closed && ClipperLib2.ClipperBase.SlopesEqual4(E.Prev.Curr, E.Curr, E.Next.Curr, this.m_UseFullRange) && (!this.PreserveCollinear || !this.Pt2IsBetweenPt1AndPt3(E.Prev.Curr, E.Curr, E.Next.Curr))) {
        if (E === eStart)
          eStart = E.Next;
        E = this.RemoveEdge(E);
        E = E.Prev;
        eLoopStop = E;
        continue;
      }
      E = E.Next;
      if (E === eLoopStop || !Closed && E.Next === eStart) break;
    }
    if (!Closed && E === E.Next || Closed && E.Prev === E.Next)
      return false;
    if (!Closed) {
      this.m_HasOpenPaths = true;
      eStart.Prev.OutIdx = ClipperLib2.ClipperBase.Skip;
    }
    E = eStart;
    do {
      this.InitEdge2(E, polyType);
      E = E.Next;
      if (IsFlat && E.Curr.Y !== eStart.Curr.Y)
        IsFlat = false;
    } while (E !== eStart);
    if (IsFlat) {
      if (Closed)
        return false;
      E.Prev.OutIdx = ClipperLib2.ClipperBase.Skip;
      var locMin = new ClipperLib2.LocalMinima();
      locMin.Next = null;
      locMin.Y = E.Bot.Y;
      locMin.LeftBound = null;
      locMin.RightBound = E;
      locMin.RightBound.Side = ClipperLib2.EdgeSide.esRight;
      locMin.RightBound.WindDelta = 0;
      for (; ; ) {
        if (E.Bot.X !== E.Prev.Top.X) this.ReverseHorizontal(E);
        if (E.Next.OutIdx === ClipperLib2.ClipperBase.Skip) break;
        E.NextInLML = E.Next;
        E = E.Next;
      }
      this.InsertLocalMinima(locMin);
      this.m_edges.push(edges);
      return true;
    }
    this.m_edges.push(edges);
    var leftBoundIsForward;
    var EMin = null;
    if (ClipperLib2.IntPoint.op_Equality(E.Prev.Bot, E.Prev.Top))
      E = E.Next;
    for (; ; ) {
      E = this.FindNextLocMin(E);
      if (E === EMin)
        break;
      else if (EMin === null)
        EMin = E;
      var locMin = new ClipperLib2.LocalMinima();
      locMin.Next = null;
      locMin.Y = E.Bot.Y;
      if (E.Dx < E.Prev.Dx) {
        locMin.LeftBound = E.Prev;
        locMin.RightBound = E;
        leftBoundIsForward = false;
      } else {
        locMin.LeftBound = E;
        locMin.RightBound = E.Prev;
        leftBoundIsForward = true;
      }
      locMin.LeftBound.Side = ClipperLib2.EdgeSide.esLeft;
      locMin.RightBound.Side = ClipperLib2.EdgeSide.esRight;
      if (!Closed)
        locMin.LeftBound.WindDelta = 0;
      else if (locMin.LeftBound.Next === locMin.RightBound)
        locMin.LeftBound.WindDelta = -1;
      else
        locMin.LeftBound.WindDelta = 1;
      locMin.RightBound.WindDelta = -locMin.LeftBound.WindDelta;
      E = this.ProcessBound(locMin.LeftBound, leftBoundIsForward);
      if (E.OutIdx === ClipperLib2.ClipperBase.Skip)
        E = this.ProcessBound(E, leftBoundIsForward);
      var E2 = this.ProcessBound(locMin.RightBound, !leftBoundIsForward);
      if (E2.OutIdx === ClipperLib2.ClipperBase.Skip) E2 = this.ProcessBound(E2, !leftBoundIsForward);
      if (locMin.LeftBound.OutIdx === ClipperLib2.ClipperBase.Skip)
        locMin.LeftBound = null;
      else if (locMin.RightBound.OutIdx === ClipperLib2.ClipperBase.Skip)
        locMin.RightBound = null;
      this.InsertLocalMinima(locMin);
      if (!leftBoundIsForward)
        E = E2;
    }
    return true;
  };
  ClipperLib2.ClipperBase.prototype.AddPaths = function(ppg, polyType, closed) {
    var result = false;
    for (var i = 0, ilen = ppg.length; i < ilen; ++i)
      if (this.AddPath(ppg[i], polyType, closed))
        result = true;
    return result;
  };
  ClipperLib2.ClipperBase.prototype.Pt2IsBetweenPt1AndPt3 = function(pt1, pt2, pt3) {
    if (ClipperLib2.IntPoint.op_Equality(pt1, pt3) || ClipperLib2.IntPoint.op_Equality(pt1, pt2) || ClipperLib2.IntPoint.op_Equality(pt3, pt2))
      return false;
    else if (pt1.X !== pt3.X)
      return pt2.X > pt1.X === pt2.X < pt3.X;
    else
      return pt2.Y > pt1.Y === pt2.Y < pt3.Y;
  };
  ClipperLib2.ClipperBase.prototype.RemoveEdge = function(e) {
    e.Prev.Next = e.Next;
    e.Next.Prev = e.Prev;
    var result = e.Next;
    e.Prev = null;
    return result;
  };
  ClipperLib2.ClipperBase.prototype.SetDx = function(e) {
    e.Delta.X = e.Top.X - e.Bot.X;
    e.Delta.Y = e.Top.Y - e.Bot.Y;
    if (e.Delta.Y === 0) e.Dx = ClipperLib2.ClipperBase.horizontal;
    else e.Dx = e.Delta.X / e.Delta.Y;
  };
  ClipperLib2.ClipperBase.prototype.InsertLocalMinima = function(newLm) {
    if (this.m_MinimaList === null) {
      this.m_MinimaList = newLm;
    } else if (newLm.Y >= this.m_MinimaList.Y) {
      newLm.Next = this.m_MinimaList;
      this.m_MinimaList = newLm;
    } else {
      var tmpLm = this.m_MinimaList;
      while (tmpLm.Next !== null && newLm.Y < tmpLm.Next.Y)
        tmpLm = tmpLm.Next;
      newLm.Next = tmpLm.Next;
      tmpLm.Next = newLm;
    }
  };
  ClipperLib2.ClipperBase.prototype.PopLocalMinima = function(Y, current) {
    current.v = this.m_CurrentLM;
    if (this.m_CurrentLM !== null && this.m_CurrentLM.Y === Y) {
      this.m_CurrentLM = this.m_CurrentLM.Next;
      return true;
    }
    return false;
  };
  ClipperLib2.ClipperBase.prototype.ReverseHorizontal = function(e) {
    var tmp = e.Top.X;
    e.Top.X = e.Bot.X;
    e.Bot.X = tmp;
    if (ClipperLib2.use_xyz) {
      tmp = e.Top.Z;
      e.Top.Z = e.Bot.Z;
      e.Bot.Z = tmp;
    }
  };
  ClipperLib2.ClipperBase.prototype.Reset = function() {
    this.m_CurrentLM = this.m_MinimaList;
    if (this.m_CurrentLM === null)
      return;
    this.m_Scanbeam = null;
    var lm = this.m_MinimaList;
    while (lm !== null) {
      this.InsertScanbeam(lm.Y);
      var e = lm.LeftBound;
      if (e !== null) {
        e.Curr.X = e.Bot.X;
        e.Curr.Y = e.Bot.Y;
        if (ClipperLib2.use_xyz) e.Curr.Z = e.Bot.Z;
        e.OutIdx = ClipperLib2.ClipperBase.Unassigned;
      }
      e = lm.RightBound;
      if (e !== null) {
        e.Curr.X = e.Bot.X;
        e.Curr.Y = e.Bot.Y;
        if (ClipperLib2.use_xyz) e.Curr.Z = e.Bot.Z;
        e.OutIdx = ClipperLib2.ClipperBase.Unassigned;
      }
      lm = lm.Next;
    }
    this.m_ActiveEdges = null;
  };
  ClipperLib2.ClipperBase.prototype.InsertScanbeam = function(Y) {
    if (this.m_Scanbeam === null) {
      this.m_Scanbeam = new ClipperLib2.Scanbeam();
      this.m_Scanbeam.Next = null;
      this.m_Scanbeam.Y = Y;
    } else if (Y > this.m_Scanbeam.Y) {
      var newSb = new ClipperLib2.Scanbeam();
      newSb.Y = Y;
      newSb.Next = this.m_Scanbeam;
      this.m_Scanbeam = newSb;
    } else {
      var sb2 = this.m_Scanbeam;
      while (sb2.Next !== null && Y <= sb2.Next.Y) {
        sb2 = sb2.Next;
      }
      if (Y === sb2.Y) {
        return;
      }
      var newSb1 = new ClipperLib2.Scanbeam();
      newSb1.Y = Y;
      newSb1.Next = sb2.Next;
      sb2.Next = newSb1;
    }
  };
  ClipperLib2.ClipperBase.prototype.PopScanbeam = function(Y) {
    if (this.m_Scanbeam === null) {
      Y.v = 0;
      return false;
    }
    Y.v = this.m_Scanbeam.Y;
    this.m_Scanbeam = this.m_Scanbeam.Next;
    return true;
  };
  ClipperLib2.ClipperBase.prototype.LocalMinimaPending = function() {
    return this.m_CurrentLM !== null;
  };
  ClipperLib2.ClipperBase.prototype.CreateOutRec = function() {
    var result = new ClipperLib2.OutRec();
    result.Idx = ClipperLib2.ClipperBase.Unassigned;
    result.IsHole = false;
    result.IsOpen = false;
    result.FirstLeft = null;
    result.Pts = null;
    result.BottomPt = null;
    result.PolyNode = null;
    this.m_PolyOuts.push(result);
    result.Idx = this.m_PolyOuts.length - 1;
    return result;
  };
  ClipperLib2.ClipperBase.prototype.DisposeOutRec = function(index) {
    var outRec = this.m_PolyOuts[index];
    outRec.Pts = null;
    outRec = null;
    this.m_PolyOuts[index] = null;
  };
  ClipperLib2.ClipperBase.prototype.UpdateEdgeIntoAEL = function(e) {
    if (e.NextInLML === null) {
      ClipperLib2.Error("UpdateEdgeIntoAEL: invalid call");
    }
    var AelPrev = e.PrevInAEL;
    var AelNext = e.NextInAEL;
    e.NextInLML.OutIdx = e.OutIdx;
    if (AelPrev !== null) {
      AelPrev.NextInAEL = e.NextInLML;
    } else {
      this.m_ActiveEdges = e.NextInLML;
    }
    if (AelNext !== null) {
      AelNext.PrevInAEL = e.NextInLML;
    }
    e.NextInLML.Side = e.Side;
    e.NextInLML.WindDelta = e.WindDelta;
    e.NextInLML.WindCnt = e.WindCnt;
    e.NextInLML.WindCnt2 = e.WindCnt2;
    e = e.NextInLML;
    e.Curr.X = e.Bot.X;
    e.Curr.Y = e.Bot.Y;
    e.PrevInAEL = AelPrev;
    e.NextInAEL = AelNext;
    if (!ClipperLib2.ClipperBase.IsHorizontal(e)) {
      this.InsertScanbeam(e.Top.Y);
    }
    return e;
  };
  ClipperLib2.ClipperBase.prototype.SwapPositionsInAEL = function(edge1, edge2) {
    if (edge1.NextInAEL === edge1.PrevInAEL || edge2.NextInAEL === edge2.PrevInAEL) {
      return;
    }
    if (edge1.NextInAEL === edge2) {
      var next = edge2.NextInAEL;
      if (next !== null) {
        next.PrevInAEL = edge1;
      }
      var prev = edge1.PrevInAEL;
      if (prev !== null) {
        prev.NextInAEL = edge2;
      }
      edge2.PrevInAEL = prev;
      edge2.NextInAEL = edge1;
      edge1.PrevInAEL = edge2;
      edge1.NextInAEL = next;
    } else if (edge2.NextInAEL === edge1) {
      var next1 = edge1.NextInAEL;
      if (next1 !== null) {
        next1.PrevInAEL = edge2;
      }
      var prev1 = edge2.PrevInAEL;
      if (prev1 !== null) {
        prev1.NextInAEL = edge1;
      }
      edge1.PrevInAEL = prev1;
      edge1.NextInAEL = edge2;
      edge2.PrevInAEL = edge1;
      edge2.NextInAEL = next1;
    } else {
      var next2 = edge1.NextInAEL;
      var prev2 = edge1.PrevInAEL;
      edge1.NextInAEL = edge2.NextInAEL;
      if (edge1.NextInAEL !== null) {
        edge1.NextInAEL.PrevInAEL = edge1;
      }
      edge1.PrevInAEL = edge2.PrevInAEL;
      if (edge1.PrevInAEL !== null) {
        edge1.PrevInAEL.NextInAEL = edge1;
      }
      edge2.NextInAEL = next2;
      if (edge2.NextInAEL !== null) {
        edge2.NextInAEL.PrevInAEL = edge2;
      }
      edge2.PrevInAEL = prev2;
      if (edge2.PrevInAEL !== null) {
        edge2.PrevInAEL.NextInAEL = edge2;
      }
    }
    if (edge1.PrevInAEL === null) {
      this.m_ActiveEdges = edge1;
    } else {
      if (edge2.PrevInAEL === null) {
        this.m_ActiveEdges = edge2;
      }
    }
  };
  ClipperLib2.ClipperBase.prototype.DeleteFromAEL = function(e) {
    var AelPrev = e.PrevInAEL;
    var AelNext = e.NextInAEL;
    if (AelPrev === null && AelNext === null && e !== this.m_ActiveEdges) {
      return;
    }
    if (AelPrev !== null) {
      AelPrev.NextInAEL = AelNext;
    } else {
      this.m_ActiveEdges = AelNext;
    }
    if (AelNext !== null) {
      AelNext.PrevInAEL = AelPrev;
    }
    e.NextInAEL = null;
    e.PrevInAEL = null;
  };
  ClipperLib2.Clipper = function(InitOptions) {
    if (typeof InitOptions === "undefined") InitOptions = 0;
    this.m_PolyOuts = null;
    this.m_ClipType = ClipperLib2.ClipType.ctIntersection;
    this.m_Scanbeam = null;
    this.m_Maxima = null;
    this.m_ActiveEdges = null;
    this.m_SortedEdges = null;
    this.m_IntersectList = null;
    this.m_IntersectNodeComparer = null;
    this.m_ExecuteLocked = false;
    this.m_ClipFillType = ClipperLib2.PolyFillType.pftEvenOdd;
    this.m_SubjFillType = ClipperLib2.PolyFillType.pftEvenOdd;
    this.m_Joins = null;
    this.m_GhostJoins = null;
    this.m_UsingPolyTree = false;
    this.ReverseSolution = false;
    this.StrictlySimple = false;
    ClipperLib2.ClipperBase.call(this);
    this.m_Scanbeam = null;
    this.m_Maxima = null;
    this.m_ActiveEdges = null;
    this.m_SortedEdges = null;
    this.m_IntersectList = new Array();
    this.m_IntersectNodeComparer = ClipperLib2.MyIntersectNodeSort.Compare;
    this.m_ExecuteLocked = false;
    this.m_UsingPolyTree = false;
    this.m_PolyOuts = new Array();
    this.m_Joins = new Array();
    this.m_GhostJoins = new Array();
    this.ReverseSolution = (1 & InitOptions) !== 0;
    this.StrictlySimple = (2 & InitOptions) !== 0;
    this.PreserveCollinear = (4 & InitOptions) !== 0;
    if (ClipperLib2.use_xyz) {
      this.ZFillFunction = null;
    }
  };
  ClipperLib2.Clipper.ioReverseSolution = 1;
  ClipperLib2.Clipper.ioStrictlySimple = 2;
  ClipperLib2.Clipper.ioPreserveCollinear = 4;
  ClipperLib2.Clipper.prototype.Clear = function() {
    if (this.m_edges.length === 0)
      return;
    this.DisposeAllPolyPts();
    ClipperLib2.ClipperBase.prototype.Clear.call(this);
  };
  ClipperLib2.Clipper.prototype.InsertMaxima = function(X) {
    var newMax = new ClipperLib2.Maxima();
    newMax.X = X;
    if (this.m_Maxima === null) {
      this.m_Maxima = newMax;
      this.m_Maxima.Next = null;
      this.m_Maxima.Prev = null;
    } else if (X < this.m_Maxima.X) {
      newMax.Next = this.m_Maxima;
      newMax.Prev = null;
      this.m_Maxima = newMax;
    } else {
      var m = this.m_Maxima;
      while (m.Next !== null && X >= m.Next.X) {
        m = m.Next;
      }
      if (X === m.X) {
        return;
      }
      newMax.Next = m.Next;
      newMax.Prev = m;
      if (m.Next !== null) {
        m.Next.Prev = newMax;
      }
      m.Next = newMax;
    }
  };
  ClipperLib2.Clipper.prototype.Execute = function() {
    var a = arguments, alen = a.length, ispolytree = a[1] instanceof ClipperLib2.PolyTree;
    if (alen === 4 && !ispolytree) {
      var clipType = a[0], solution = a[1], subjFillType = a[2], clipFillType = a[3];
      if (this.m_ExecuteLocked)
        return false;
      if (this.m_HasOpenPaths)
        ClipperLib2.Error("Error: PolyTree struct is needed for open path clipping.");
      this.m_ExecuteLocked = true;
      ClipperLib2.Clear(solution);
      this.m_SubjFillType = subjFillType;
      this.m_ClipFillType = clipFillType;
      this.m_ClipType = clipType;
      this.m_UsingPolyTree = false;
      try {
        var succeeded = this.ExecuteInternal();
        if (succeeded) this.BuildResult(solution);
      } finally {
        this.DisposeAllPolyPts();
        this.m_ExecuteLocked = false;
      }
      return succeeded;
    } else if (alen === 4 && ispolytree) {
      var clipType = a[0], polytree = a[1], subjFillType = a[2], clipFillType = a[3];
      if (this.m_ExecuteLocked)
        return false;
      this.m_ExecuteLocked = true;
      this.m_SubjFillType = subjFillType;
      this.m_ClipFillType = clipFillType;
      this.m_ClipType = clipType;
      this.m_UsingPolyTree = true;
      try {
        var succeeded = this.ExecuteInternal();
        if (succeeded) this.BuildResult2(polytree);
      } finally {
        this.DisposeAllPolyPts();
        this.m_ExecuteLocked = false;
      }
      return succeeded;
    } else if (alen === 2 && !ispolytree) {
      var clipType = a[0], solution = a[1];
      return this.Execute(clipType, solution, ClipperLib2.PolyFillType.pftEvenOdd, ClipperLib2.PolyFillType.pftEvenOdd);
    } else if (alen === 2 && ispolytree) {
      var clipType = a[0], polytree = a[1];
      return this.Execute(clipType, polytree, ClipperLib2.PolyFillType.pftEvenOdd, ClipperLib2.PolyFillType.pftEvenOdd);
    }
  };
  ClipperLib2.Clipper.prototype.FixHoleLinkage = function(outRec) {
    if (outRec.FirstLeft === null || outRec.IsHole !== outRec.FirstLeft.IsHole && outRec.FirstLeft.Pts !== null)
      return;
    var orfl = outRec.FirstLeft;
    while (orfl !== null && (orfl.IsHole === outRec.IsHole || orfl.Pts === null))
      orfl = orfl.FirstLeft;
    outRec.FirstLeft = orfl;
  };
  ClipperLib2.Clipper.prototype.ExecuteInternal = function() {
    try {
      this.Reset();
      this.m_SortedEdges = null;
      this.m_Maxima = null;
      var botY = {}, topY = {};
      if (!this.PopScanbeam(botY)) {
        return false;
      }
      this.InsertLocalMinimaIntoAEL(botY.v);
      while (this.PopScanbeam(topY) || this.LocalMinimaPending()) {
        this.ProcessHorizontals();
        this.m_GhostJoins.length = 0;
        if (!this.ProcessIntersections(topY.v)) {
          return false;
        }
        this.ProcessEdgesAtTopOfScanbeam(topY.v);
        botY.v = topY.v;
        this.InsertLocalMinimaIntoAEL(botY.v);
      }
      var outRec, i, ilen;
      for (i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++) {
        outRec = this.m_PolyOuts[i];
        if (outRec.Pts === null || outRec.IsOpen) continue;
        if ((outRec.IsHole ^ this.ReverseSolution) == this.Area$1(outRec) > 0)
          this.ReversePolyPtLinks(outRec.Pts);
      }
      this.JoinCommonEdges();
      for (i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++) {
        outRec = this.m_PolyOuts[i];
        if (outRec.Pts === null)
          continue;
        else if (outRec.IsOpen)
          this.FixupOutPolyline(outRec);
        else
          this.FixupOutPolygon(outRec);
      }
      if (this.StrictlySimple) this.DoSimplePolygons();
      return true;
    } finally {
      this.m_Joins.length = 0;
      this.m_GhostJoins.length = 0;
    }
  };
  ClipperLib2.Clipper.prototype.DisposeAllPolyPts = function() {
    for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; ++i)
      this.DisposeOutRec(i);
    ClipperLib2.Clear(this.m_PolyOuts);
  };
  ClipperLib2.Clipper.prototype.AddJoin = function(Op1, Op2, OffPt) {
    var j = new ClipperLib2.Join();
    j.OutPt1 = Op1;
    j.OutPt2 = Op2;
    j.OffPt.X = OffPt.X;
    j.OffPt.Y = OffPt.Y;
    if (ClipperLib2.use_xyz) j.OffPt.Z = OffPt.Z;
    this.m_Joins.push(j);
  };
  ClipperLib2.Clipper.prototype.AddGhostJoin = function(Op, OffPt) {
    var j = new ClipperLib2.Join();
    j.OutPt1 = Op;
    j.OffPt.X = OffPt.X;
    j.OffPt.Y = OffPt.Y;
    if (ClipperLib2.use_xyz) j.OffPt.Z = OffPt.Z;
    this.m_GhostJoins.push(j);
  };
  ClipperLib2.Clipper.prototype.SetZ = function(pt, e1, e2) {
    if (this.ZFillFunction !== null) {
      if (pt.Z !== 0 || this.ZFillFunction === null) return;
      else if (ClipperLib2.IntPoint.op_Equality(pt, e1.Bot)) pt.Z = e1.Bot.Z;
      else if (ClipperLib2.IntPoint.op_Equality(pt, e1.Top)) pt.Z = e1.Top.Z;
      else if (ClipperLib2.IntPoint.op_Equality(pt, e2.Bot)) pt.Z = e2.Bot.Z;
      else if (ClipperLib2.IntPoint.op_Equality(pt, e2.Top)) pt.Z = e2.Top.Z;
      else this.ZFillFunction(e1.Bot, e1.Top, e2.Bot, e2.Top, pt);
    }
  };
  ClipperLib2.Clipper.prototype.InsertLocalMinimaIntoAEL = function(botY) {
    var lm = {};
    var lb;
    var rb;
    while (this.PopLocalMinima(botY, lm)) {
      lb = lm.v.LeftBound;
      rb = lm.v.RightBound;
      var Op1 = null;
      if (lb === null) {
        this.InsertEdgeIntoAEL(rb, null);
        this.SetWindingCount(rb);
        if (this.IsContributing(rb))
          Op1 = this.AddOutPt(rb, rb.Bot);
      } else if (rb === null) {
        this.InsertEdgeIntoAEL(lb, null);
        this.SetWindingCount(lb);
        if (this.IsContributing(lb))
          Op1 = this.AddOutPt(lb, lb.Bot);
        this.InsertScanbeam(lb.Top.Y);
      } else {
        this.InsertEdgeIntoAEL(lb, null);
        this.InsertEdgeIntoAEL(rb, lb);
        this.SetWindingCount(lb);
        rb.WindCnt = lb.WindCnt;
        rb.WindCnt2 = lb.WindCnt2;
        if (this.IsContributing(lb))
          Op1 = this.AddLocalMinPoly(lb, rb, lb.Bot);
        this.InsertScanbeam(lb.Top.Y);
      }
      if (rb !== null) {
        if (ClipperLib2.ClipperBase.IsHorizontal(rb)) {
          if (rb.NextInLML !== null) {
            this.InsertScanbeam(rb.NextInLML.Top.Y);
          }
          this.AddEdgeToSEL(rb);
        } else {
          this.InsertScanbeam(rb.Top.Y);
        }
      }
      if (lb === null || rb === null) continue;
      if (Op1 !== null && ClipperLib2.ClipperBase.IsHorizontal(rb) && this.m_GhostJoins.length > 0 && rb.WindDelta !== 0) {
        for (var i = 0, ilen = this.m_GhostJoins.length; i < ilen; i++) {
          var j = this.m_GhostJoins[i];
          if (this.HorzSegmentsOverlap(j.OutPt1.Pt.X, j.OffPt.X, rb.Bot.X, rb.Top.X))
            this.AddJoin(j.OutPt1, Op1, j.OffPt);
        }
      }
      if (lb.OutIdx >= 0 && lb.PrevInAEL !== null && lb.PrevInAEL.Curr.X === lb.Bot.X && lb.PrevInAEL.OutIdx >= 0 && ClipperLib2.ClipperBase.SlopesEqual5(lb.PrevInAEL.Curr, lb.PrevInAEL.Top, lb.Curr, lb.Top, this.m_UseFullRange) && lb.WindDelta !== 0 && lb.PrevInAEL.WindDelta !== 0) {
        var Op2 = this.AddOutPt(lb.PrevInAEL, lb.Bot);
        this.AddJoin(Op1, Op2, lb.Top);
      }
      if (lb.NextInAEL !== rb) {
        if (rb.OutIdx >= 0 && rb.PrevInAEL.OutIdx >= 0 && ClipperLib2.ClipperBase.SlopesEqual5(rb.PrevInAEL.Curr, rb.PrevInAEL.Top, rb.Curr, rb.Top, this.m_UseFullRange) && rb.WindDelta !== 0 && rb.PrevInAEL.WindDelta !== 0) {
          var Op2 = this.AddOutPt(rb.PrevInAEL, rb.Bot);
          this.AddJoin(Op1, Op2, rb.Top);
        }
        var e = lb.NextInAEL;
        if (e !== null)
          while (e !== rb) {
            this.IntersectEdges(rb, e, lb.Curr);
            e = e.NextInAEL;
          }
      }
    }
  };
  ClipperLib2.Clipper.prototype.InsertEdgeIntoAEL = function(edge, startEdge) {
    if (this.m_ActiveEdges === null) {
      edge.PrevInAEL = null;
      edge.NextInAEL = null;
      this.m_ActiveEdges = edge;
    } else if (startEdge === null && this.E2InsertsBeforeE1(this.m_ActiveEdges, edge)) {
      edge.PrevInAEL = null;
      edge.NextInAEL = this.m_ActiveEdges;
      this.m_ActiveEdges.PrevInAEL = edge;
      this.m_ActiveEdges = edge;
    } else {
      if (startEdge === null)
        startEdge = this.m_ActiveEdges;
      while (startEdge.NextInAEL !== null && !this.E2InsertsBeforeE1(startEdge.NextInAEL, edge))
        startEdge = startEdge.NextInAEL;
      edge.NextInAEL = startEdge.NextInAEL;
      if (startEdge.NextInAEL !== null)
        startEdge.NextInAEL.PrevInAEL = edge;
      edge.PrevInAEL = startEdge;
      startEdge.NextInAEL = edge;
    }
  };
  ClipperLib2.Clipper.prototype.E2InsertsBeforeE1 = function(e1, e2) {
    if (e2.Curr.X === e1.Curr.X) {
      if (e2.Top.Y > e1.Top.Y)
        return e2.Top.X < ClipperLib2.Clipper.TopX(e1, e2.Top.Y);
      else
        return e1.Top.X > ClipperLib2.Clipper.TopX(e2, e1.Top.Y);
    } else
      return e2.Curr.X < e1.Curr.X;
  };
  ClipperLib2.Clipper.prototype.IsEvenOddFillType = function(edge) {
    if (edge.PolyTyp === ClipperLib2.PolyType.ptSubject)
      return this.m_SubjFillType === ClipperLib2.PolyFillType.pftEvenOdd;
    else
      return this.m_ClipFillType === ClipperLib2.PolyFillType.pftEvenOdd;
  };
  ClipperLib2.Clipper.prototype.IsEvenOddAltFillType = function(edge) {
    if (edge.PolyTyp === ClipperLib2.PolyType.ptSubject)
      return this.m_ClipFillType === ClipperLib2.PolyFillType.pftEvenOdd;
    else
      return this.m_SubjFillType === ClipperLib2.PolyFillType.pftEvenOdd;
  };
  ClipperLib2.Clipper.prototype.IsContributing = function(edge) {
    var pft, pft2;
    if (edge.PolyTyp === ClipperLib2.PolyType.ptSubject) {
      pft = this.m_SubjFillType;
      pft2 = this.m_ClipFillType;
    } else {
      pft = this.m_ClipFillType;
      pft2 = this.m_SubjFillType;
    }
    switch (pft) {
      case ClipperLib2.PolyFillType.pftEvenOdd:
        if (edge.WindDelta === 0 && edge.WindCnt !== 1)
          return false;
        break;
      case ClipperLib2.PolyFillType.pftNonZero:
        if (Math.abs(edge.WindCnt) !== 1)
          return false;
        break;
      case ClipperLib2.PolyFillType.pftPositive:
        if (edge.WindCnt !== 1)
          return false;
        break;
      default:
        if (edge.WindCnt !== -1)
          return false;
        break;
    }
    switch (this.m_ClipType) {
      case ClipperLib2.ClipType.ctIntersection:
        switch (pft2) {
          case ClipperLib2.PolyFillType.pftEvenOdd:
          case ClipperLib2.PolyFillType.pftNonZero:
            return edge.WindCnt2 !== 0;
          case ClipperLib2.PolyFillType.pftPositive:
            return edge.WindCnt2 > 0;
          default:
            return edge.WindCnt2 < 0;
        }
      case ClipperLib2.ClipType.ctUnion:
        switch (pft2) {
          case ClipperLib2.PolyFillType.pftEvenOdd:
          case ClipperLib2.PolyFillType.pftNonZero:
            return edge.WindCnt2 === 0;
          case ClipperLib2.PolyFillType.pftPositive:
            return edge.WindCnt2 <= 0;
          default:
            return edge.WindCnt2 >= 0;
        }
      case ClipperLib2.ClipType.ctDifference:
        if (edge.PolyTyp === ClipperLib2.PolyType.ptSubject)
          switch (pft2) {
            case ClipperLib2.PolyFillType.pftEvenOdd:
            case ClipperLib2.PolyFillType.pftNonZero:
              return edge.WindCnt2 === 0;
            case ClipperLib2.PolyFillType.pftPositive:
              return edge.WindCnt2 <= 0;
            default:
              return edge.WindCnt2 >= 0;
          }
        else
          switch (pft2) {
            case ClipperLib2.PolyFillType.pftEvenOdd:
            case ClipperLib2.PolyFillType.pftNonZero:
              return edge.WindCnt2 !== 0;
            case ClipperLib2.PolyFillType.pftPositive:
              return edge.WindCnt2 > 0;
            default:
              return edge.WindCnt2 < 0;
          }
      case ClipperLib2.ClipType.ctXor:
        if (edge.WindDelta === 0)
          switch (pft2) {
            case ClipperLib2.PolyFillType.pftEvenOdd:
            case ClipperLib2.PolyFillType.pftNonZero:
              return edge.WindCnt2 === 0;
            case ClipperLib2.PolyFillType.pftPositive:
              return edge.WindCnt2 <= 0;
            default:
              return edge.WindCnt2 >= 0;
          }
        else
          return true;
    }
    return true;
  };
  ClipperLib2.Clipper.prototype.SetWindingCount = function(edge) {
    var e = edge.PrevInAEL;
    while (e !== null && (e.PolyTyp !== edge.PolyTyp || e.WindDelta === 0))
      e = e.PrevInAEL;
    if (e === null) {
      var pft = edge.PolyTyp === ClipperLib2.PolyType.ptSubject ? this.m_SubjFillType : this.m_ClipFillType;
      if (edge.WindDelta === 0) {
        edge.WindCnt = pft === ClipperLib2.PolyFillType.pftNegative ? -1 : 1;
      } else {
        edge.WindCnt = edge.WindDelta;
      }
      edge.WindCnt2 = 0;
      e = this.m_ActiveEdges;
    } else if (edge.WindDelta === 0 && this.m_ClipType !== ClipperLib2.ClipType.ctUnion) {
      edge.WindCnt = 1;
      edge.WindCnt2 = e.WindCnt2;
      e = e.NextInAEL;
    } else if (this.IsEvenOddFillType(edge)) {
      if (edge.WindDelta === 0) {
        var Inside = true;
        var e2 = e.PrevInAEL;
        while (e2 !== null) {
          if (e2.PolyTyp === e.PolyTyp && e2.WindDelta !== 0)
            Inside = !Inside;
          e2 = e2.PrevInAEL;
        }
        edge.WindCnt = Inside ? 0 : 1;
      } else {
        edge.WindCnt = edge.WindDelta;
      }
      edge.WindCnt2 = e.WindCnt2;
      e = e.NextInAEL;
    } else {
      if (e.WindCnt * e.WindDelta < 0) {
        if (Math.abs(e.WindCnt) > 1) {
          if (e.WindDelta * edge.WindDelta < 0)
            edge.WindCnt = e.WindCnt;
          else
            edge.WindCnt = e.WindCnt + edge.WindDelta;
        } else
          edge.WindCnt = edge.WindDelta === 0 ? 1 : edge.WindDelta;
      } else {
        if (edge.WindDelta === 0)
          edge.WindCnt = e.WindCnt < 0 ? e.WindCnt - 1 : e.WindCnt + 1;
        else if (e.WindDelta * edge.WindDelta < 0)
          edge.WindCnt = e.WindCnt;
        else
          edge.WindCnt = e.WindCnt + edge.WindDelta;
      }
      edge.WindCnt2 = e.WindCnt2;
      e = e.NextInAEL;
    }
    if (this.IsEvenOddAltFillType(edge)) {
      while (e !== edge) {
        if (e.WindDelta !== 0)
          edge.WindCnt2 = edge.WindCnt2 === 0 ? 1 : 0;
        e = e.NextInAEL;
      }
    } else {
      while (e !== edge) {
        edge.WindCnt2 += e.WindDelta;
        e = e.NextInAEL;
      }
    }
  };
  ClipperLib2.Clipper.prototype.AddEdgeToSEL = function(edge) {
    if (this.m_SortedEdges === null) {
      this.m_SortedEdges = edge;
      edge.PrevInSEL = null;
      edge.NextInSEL = null;
    } else {
      edge.NextInSEL = this.m_SortedEdges;
      edge.PrevInSEL = null;
      this.m_SortedEdges.PrevInSEL = edge;
      this.m_SortedEdges = edge;
    }
  };
  ClipperLib2.Clipper.prototype.PopEdgeFromSEL = function(e) {
    e.v = this.m_SortedEdges;
    if (e.v === null) {
      return false;
    }
    var oldE = e.v;
    this.m_SortedEdges = e.v.NextInSEL;
    if (this.m_SortedEdges !== null) {
      this.m_SortedEdges.PrevInSEL = null;
    }
    oldE.NextInSEL = null;
    oldE.PrevInSEL = null;
    return true;
  };
  ClipperLib2.Clipper.prototype.CopyAELToSEL = function() {
    var e = this.m_ActiveEdges;
    this.m_SortedEdges = e;
    while (e !== null) {
      e.PrevInSEL = e.PrevInAEL;
      e.NextInSEL = e.NextInAEL;
      e = e.NextInAEL;
    }
  };
  ClipperLib2.Clipper.prototype.SwapPositionsInSEL = function(edge1, edge2) {
    if (edge1.NextInSEL === null && edge1.PrevInSEL === null)
      return;
    if (edge2.NextInSEL === null && edge2.PrevInSEL === null)
      return;
    if (edge1.NextInSEL === edge2) {
      var next = edge2.NextInSEL;
      if (next !== null)
        next.PrevInSEL = edge1;
      var prev = edge1.PrevInSEL;
      if (prev !== null)
        prev.NextInSEL = edge2;
      edge2.PrevInSEL = prev;
      edge2.NextInSEL = edge1;
      edge1.PrevInSEL = edge2;
      edge1.NextInSEL = next;
    } else if (edge2.NextInSEL === edge1) {
      var next = edge1.NextInSEL;
      if (next !== null)
        next.PrevInSEL = edge2;
      var prev = edge2.PrevInSEL;
      if (prev !== null)
        prev.NextInSEL = edge1;
      edge1.PrevInSEL = prev;
      edge1.NextInSEL = edge2;
      edge2.PrevInSEL = edge1;
      edge2.NextInSEL = next;
    } else {
      var next = edge1.NextInSEL;
      var prev = edge1.PrevInSEL;
      edge1.NextInSEL = edge2.NextInSEL;
      if (edge1.NextInSEL !== null)
        edge1.NextInSEL.PrevInSEL = edge1;
      edge1.PrevInSEL = edge2.PrevInSEL;
      if (edge1.PrevInSEL !== null)
        edge1.PrevInSEL.NextInSEL = edge1;
      edge2.NextInSEL = next;
      if (edge2.NextInSEL !== null)
        edge2.NextInSEL.PrevInSEL = edge2;
      edge2.PrevInSEL = prev;
      if (edge2.PrevInSEL !== null)
        edge2.PrevInSEL.NextInSEL = edge2;
    }
    if (edge1.PrevInSEL === null)
      this.m_SortedEdges = edge1;
    else if (edge2.PrevInSEL === null)
      this.m_SortedEdges = edge2;
  };
  ClipperLib2.Clipper.prototype.AddLocalMaxPoly = function(e1, e2, pt) {
    this.AddOutPt(e1, pt);
    if (e2.WindDelta === 0) this.AddOutPt(e2, pt);
    if (e1.OutIdx === e2.OutIdx) {
      e1.OutIdx = -1;
      e2.OutIdx = -1;
    } else if (e1.OutIdx < e2.OutIdx)
      this.AppendPolygon(e1, e2);
    else
      this.AppendPolygon(e2, e1);
  };
  ClipperLib2.Clipper.prototype.AddLocalMinPoly = function(e1, e2, pt) {
    var result;
    var e, prevE;
    if (ClipperLib2.ClipperBase.IsHorizontal(e2) || e1.Dx > e2.Dx) {
      result = this.AddOutPt(e1, pt);
      e2.OutIdx = e1.OutIdx;
      e1.Side = ClipperLib2.EdgeSide.esLeft;
      e2.Side = ClipperLib2.EdgeSide.esRight;
      e = e1;
      if (e.PrevInAEL === e2)
        prevE = e2.PrevInAEL;
      else
        prevE = e.PrevInAEL;
    } else {
      result = this.AddOutPt(e2, pt);
      e1.OutIdx = e2.OutIdx;
      e1.Side = ClipperLib2.EdgeSide.esRight;
      e2.Side = ClipperLib2.EdgeSide.esLeft;
      e = e2;
      if (e.PrevInAEL === e1)
        prevE = e1.PrevInAEL;
      else
        prevE = e.PrevInAEL;
    }
    if (prevE !== null && prevE.OutIdx >= 0 && prevE.Top.Y < pt.Y && e.Top.Y < pt.Y) {
      var xPrev = ClipperLib2.Clipper.TopX(prevE, pt.Y);
      var xE = ClipperLib2.Clipper.TopX(e, pt.Y);
      if (xPrev === xE && e.WindDelta !== 0 && prevE.WindDelta !== 0 && ClipperLib2.ClipperBase.SlopesEqual5(new ClipperLib2.IntPoint2(xPrev, pt.Y), prevE.Top, new ClipperLib2.IntPoint2(xE, pt.Y), e.Top, this.m_UseFullRange)) {
        var outPt = this.AddOutPt(prevE, pt);
        this.AddJoin(result, outPt, e.Top);
      }
    }
    return result;
  };
  ClipperLib2.Clipper.prototype.AddOutPt = function(e, pt) {
    if (e.OutIdx < 0) {
      var outRec = this.CreateOutRec();
      outRec.IsOpen = e.WindDelta === 0;
      var newOp = new ClipperLib2.OutPt();
      outRec.Pts = newOp;
      newOp.Idx = outRec.Idx;
      newOp.Pt.X = pt.X;
      newOp.Pt.Y = pt.Y;
      if (ClipperLib2.use_xyz) newOp.Pt.Z = pt.Z;
      newOp.Next = newOp;
      newOp.Prev = newOp;
      if (!outRec.IsOpen)
        this.SetHoleState(e, outRec);
      e.OutIdx = outRec.Idx;
      return newOp;
    } else {
      var outRec = this.m_PolyOuts[e.OutIdx];
      var op = outRec.Pts;
      var ToFront = e.Side === ClipperLib2.EdgeSide.esLeft;
      if (ToFront && ClipperLib2.IntPoint.op_Equality(pt, op.Pt))
        return op;
      else if (!ToFront && ClipperLib2.IntPoint.op_Equality(pt, op.Prev.Pt))
        return op.Prev;
      var newOp = new ClipperLib2.OutPt();
      newOp.Idx = outRec.Idx;
      newOp.Pt.X = pt.X;
      newOp.Pt.Y = pt.Y;
      if (ClipperLib2.use_xyz) newOp.Pt.Z = pt.Z;
      newOp.Next = op;
      newOp.Prev = op.Prev;
      newOp.Prev.Next = newOp;
      op.Prev = newOp;
      if (ToFront)
        outRec.Pts = newOp;
      return newOp;
    }
  };
  ClipperLib2.Clipper.prototype.GetLastOutPt = function(e) {
    var outRec = this.m_PolyOuts[e.OutIdx];
    if (e.Side === ClipperLib2.EdgeSide.esLeft) {
      return outRec.Pts;
    } else {
      return outRec.Pts.Prev;
    }
  };
  ClipperLib2.Clipper.prototype.SwapPoints = function(pt1, pt2) {
    var tmp = new ClipperLib2.IntPoint1(pt1.Value);
    pt1.Value.X = pt2.Value.X;
    pt1.Value.Y = pt2.Value.Y;
    if (ClipperLib2.use_xyz) pt1.Value.Z = pt2.Value.Z;
    pt2.Value.X = tmp.X;
    pt2.Value.Y = tmp.Y;
    if (ClipperLib2.use_xyz) pt2.Value.Z = tmp.Z;
  };
  ClipperLib2.Clipper.prototype.HorzSegmentsOverlap = function(seg1a, seg1b, seg2a, seg2b) {
    var tmp;
    if (seg1a > seg1b) {
      tmp = seg1a;
      seg1a = seg1b;
      seg1b = tmp;
    }
    if (seg2a > seg2b) {
      tmp = seg2a;
      seg2a = seg2b;
      seg2b = tmp;
    }
    return seg1a < seg2b && seg2a < seg1b;
  };
  ClipperLib2.Clipper.prototype.SetHoleState = function(e, outRec) {
    var e2 = e.PrevInAEL;
    var eTmp = null;
    while (e2 !== null) {
      if (e2.OutIdx >= 0 && e2.WindDelta !== 0) {
        if (eTmp === null)
          eTmp = e2;
        else if (eTmp.OutIdx === e2.OutIdx)
          eTmp = null;
      }
      e2 = e2.PrevInAEL;
    }
    if (eTmp === null) {
      outRec.FirstLeft = null;
      outRec.IsHole = false;
    } else {
      outRec.FirstLeft = this.m_PolyOuts[eTmp.OutIdx];
      outRec.IsHole = !outRec.FirstLeft.IsHole;
    }
  };
  ClipperLib2.Clipper.prototype.GetDx = function(pt1, pt2) {
    if (pt1.Y === pt2.Y)
      return ClipperLib2.ClipperBase.horizontal;
    else
      return (pt2.X - pt1.X) / (pt2.Y - pt1.Y);
  };
  ClipperLib2.Clipper.prototype.FirstIsBottomPt = function(btmPt1, btmPt2) {
    var p = btmPt1.Prev;
    while (ClipperLib2.IntPoint.op_Equality(p.Pt, btmPt1.Pt) && p !== btmPt1)
      p = p.Prev;
    var dx1p = Math.abs(this.GetDx(btmPt1.Pt, p.Pt));
    p = btmPt1.Next;
    while (ClipperLib2.IntPoint.op_Equality(p.Pt, btmPt1.Pt) && p !== btmPt1)
      p = p.Next;
    var dx1n = Math.abs(this.GetDx(btmPt1.Pt, p.Pt));
    p = btmPt2.Prev;
    while (ClipperLib2.IntPoint.op_Equality(p.Pt, btmPt2.Pt) && p !== btmPt2)
      p = p.Prev;
    var dx2p = Math.abs(this.GetDx(btmPt2.Pt, p.Pt));
    p = btmPt2.Next;
    while (ClipperLib2.IntPoint.op_Equality(p.Pt, btmPt2.Pt) && p !== btmPt2)
      p = p.Next;
    var dx2n = Math.abs(this.GetDx(btmPt2.Pt, p.Pt));
    if (Math.max(dx1p, dx1n) === Math.max(dx2p, dx2n) && Math.min(dx1p, dx1n) === Math.min(dx2p, dx2n)) {
      return this.Area(btmPt1) > 0;
    } else {
      return dx1p >= dx2p && dx1p >= dx2n || dx1n >= dx2p && dx1n >= dx2n;
    }
  };
  ClipperLib2.Clipper.prototype.GetBottomPt = function(pp) {
    var dups = null;
    var p = pp.Next;
    while (p !== pp) {
      if (p.Pt.Y > pp.Pt.Y) {
        pp = p;
        dups = null;
      } else if (p.Pt.Y === pp.Pt.Y && p.Pt.X <= pp.Pt.X) {
        if (p.Pt.X < pp.Pt.X) {
          dups = null;
          pp = p;
        } else {
          if (p.Next !== pp && p.Prev !== pp)
            dups = p;
        }
      }
      p = p.Next;
    }
    if (dups !== null) {
      while (dups !== p) {
        if (!this.FirstIsBottomPt(p, dups))
          pp = dups;
        dups = dups.Next;
        while (ClipperLib2.IntPoint.op_Inequality(dups.Pt, pp.Pt))
          dups = dups.Next;
      }
    }
    return pp;
  };
  ClipperLib2.Clipper.prototype.GetLowermostRec = function(outRec1, outRec2) {
    if (outRec1.BottomPt === null)
      outRec1.BottomPt = this.GetBottomPt(outRec1.Pts);
    if (outRec2.BottomPt === null)
      outRec2.BottomPt = this.GetBottomPt(outRec2.Pts);
    var bPt1 = outRec1.BottomPt;
    var bPt2 = outRec2.BottomPt;
    if (bPt1.Pt.Y > bPt2.Pt.Y)
      return outRec1;
    else if (bPt1.Pt.Y < bPt2.Pt.Y)
      return outRec2;
    else if (bPt1.Pt.X < bPt2.Pt.X)
      return outRec1;
    else if (bPt1.Pt.X > bPt2.Pt.X)
      return outRec2;
    else if (bPt1.Next === bPt1)
      return outRec2;
    else if (bPt2.Next === bPt2)
      return outRec1;
    else if (this.FirstIsBottomPt(bPt1, bPt2))
      return outRec1;
    else
      return outRec2;
  };
  ClipperLib2.Clipper.prototype.OutRec1RightOfOutRec2 = function(outRec1, outRec2) {
    do {
      outRec1 = outRec1.FirstLeft;
      if (outRec1 === outRec2)
        return true;
    } while (outRec1 !== null);
    return false;
  };
  ClipperLib2.Clipper.prototype.GetOutRec = function(idx) {
    var outrec = this.m_PolyOuts[idx];
    while (outrec !== this.m_PolyOuts[outrec.Idx])
      outrec = this.m_PolyOuts[outrec.Idx];
    return outrec;
  };
  ClipperLib2.Clipper.prototype.AppendPolygon = function(e1, e2) {
    var outRec1 = this.m_PolyOuts[e1.OutIdx];
    var outRec2 = this.m_PolyOuts[e2.OutIdx];
    var holeStateRec;
    if (this.OutRec1RightOfOutRec2(outRec1, outRec2))
      holeStateRec = outRec2;
    else if (this.OutRec1RightOfOutRec2(outRec2, outRec1))
      holeStateRec = outRec1;
    else
      holeStateRec = this.GetLowermostRec(outRec1, outRec2);
    var p1_lft = outRec1.Pts;
    var p1_rt = p1_lft.Prev;
    var p2_lft = outRec2.Pts;
    var p2_rt = p2_lft.Prev;
    if (e1.Side === ClipperLib2.EdgeSide.esLeft) {
      if (e2.Side === ClipperLib2.EdgeSide.esLeft) {
        this.ReversePolyPtLinks(p2_lft);
        p2_lft.Next = p1_lft;
        p1_lft.Prev = p2_lft;
        p1_rt.Next = p2_rt;
        p2_rt.Prev = p1_rt;
        outRec1.Pts = p2_rt;
      } else {
        p2_rt.Next = p1_lft;
        p1_lft.Prev = p2_rt;
        p2_lft.Prev = p1_rt;
        p1_rt.Next = p2_lft;
        outRec1.Pts = p2_lft;
      }
    } else {
      if (e2.Side === ClipperLib2.EdgeSide.esRight) {
        this.ReversePolyPtLinks(p2_lft);
        p1_rt.Next = p2_rt;
        p2_rt.Prev = p1_rt;
        p2_lft.Next = p1_lft;
        p1_lft.Prev = p2_lft;
      } else {
        p1_rt.Next = p2_lft;
        p2_lft.Prev = p1_rt;
        p1_lft.Prev = p2_rt;
        p2_rt.Next = p1_lft;
      }
    }
    outRec1.BottomPt = null;
    if (holeStateRec === outRec2) {
      if (outRec2.FirstLeft !== outRec1)
        outRec1.FirstLeft = outRec2.FirstLeft;
      outRec1.IsHole = outRec2.IsHole;
    }
    outRec2.Pts = null;
    outRec2.BottomPt = null;
    outRec2.FirstLeft = outRec1;
    var OKIdx = e1.OutIdx;
    var ObsoleteIdx = e2.OutIdx;
    e1.OutIdx = -1;
    e2.OutIdx = -1;
    var e = this.m_ActiveEdges;
    while (e !== null) {
      if (e.OutIdx === ObsoleteIdx) {
        e.OutIdx = OKIdx;
        e.Side = e1.Side;
        break;
      }
      e = e.NextInAEL;
    }
    outRec2.Idx = outRec1.Idx;
  };
  ClipperLib2.Clipper.prototype.ReversePolyPtLinks = function(pp) {
    if (pp === null)
      return;
    var pp1;
    var pp2;
    pp1 = pp;
    do {
      pp2 = pp1.Next;
      pp1.Next = pp1.Prev;
      pp1.Prev = pp2;
      pp1 = pp2;
    } while (pp1 !== pp);
  };
  ClipperLib2.Clipper.SwapSides = function(edge1, edge2) {
    var side = edge1.Side;
    edge1.Side = edge2.Side;
    edge2.Side = side;
  };
  ClipperLib2.Clipper.SwapPolyIndexes = function(edge1, edge2) {
    var outIdx = edge1.OutIdx;
    edge1.OutIdx = edge2.OutIdx;
    edge2.OutIdx = outIdx;
  };
  ClipperLib2.Clipper.prototype.IntersectEdges = function(e1, e2, pt) {
    var e1Contributing = e1.OutIdx >= 0;
    var e2Contributing = e2.OutIdx >= 0;
    if (ClipperLib2.use_xyz)
      this.SetZ(pt, e1, e2);
    if (ClipperLib2.use_lines) {
      if (e1.WindDelta === 0 || e2.WindDelta === 0) {
        if (e1.WindDelta === 0 && e2.WindDelta === 0) return;
        else if (e1.PolyTyp === e2.PolyTyp && e1.WindDelta !== e2.WindDelta && this.m_ClipType === ClipperLib2.ClipType.ctUnion) {
          if (e1.WindDelta === 0) {
            if (e2Contributing) {
              this.AddOutPt(e1, pt);
              if (e1Contributing)
                e1.OutIdx = -1;
            }
          } else {
            if (e1Contributing) {
              this.AddOutPt(e2, pt);
              if (e2Contributing)
                e2.OutIdx = -1;
            }
          }
        } else if (e1.PolyTyp !== e2.PolyTyp) {
          if (e1.WindDelta === 0 && Math.abs(e2.WindCnt) === 1 && (this.m_ClipType !== ClipperLib2.ClipType.ctUnion || e2.WindCnt2 === 0)) {
            this.AddOutPt(e1, pt);
            if (e1Contributing)
              e1.OutIdx = -1;
          } else if (e2.WindDelta === 0 && Math.abs(e1.WindCnt) === 1 && (this.m_ClipType !== ClipperLib2.ClipType.ctUnion || e1.WindCnt2 === 0)) {
            this.AddOutPt(e2, pt);
            if (e2Contributing)
              e2.OutIdx = -1;
          }
        }
        return;
      }
    }
    if (e1.PolyTyp === e2.PolyTyp) {
      if (this.IsEvenOddFillType(e1)) {
        var oldE1WindCnt = e1.WindCnt;
        e1.WindCnt = e2.WindCnt;
        e2.WindCnt = oldE1WindCnt;
      } else {
        if (e1.WindCnt + e2.WindDelta === 0)
          e1.WindCnt = -e1.WindCnt;
        else
          e1.WindCnt += e2.WindDelta;
        if (e2.WindCnt - e1.WindDelta === 0)
          e2.WindCnt = -e2.WindCnt;
        else
          e2.WindCnt -= e1.WindDelta;
      }
    } else {
      if (!this.IsEvenOddFillType(e2))
        e1.WindCnt2 += e2.WindDelta;
      else
        e1.WindCnt2 = e1.WindCnt2 === 0 ? 1 : 0;
      if (!this.IsEvenOddFillType(e1))
        e2.WindCnt2 -= e1.WindDelta;
      else
        e2.WindCnt2 = e2.WindCnt2 === 0 ? 1 : 0;
    }
    var e1FillType, e2FillType, e1FillType2, e2FillType2;
    if (e1.PolyTyp === ClipperLib2.PolyType.ptSubject) {
      e1FillType = this.m_SubjFillType;
      e1FillType2 = this.m_ClipFillType;
    } else {
      e1FillType = this.m_ClipFillType;
      e1FillType2 = this.m_SubjFillType;
    }
    if (e2.PolyTyp === ClipperLib2.PolyType.ptSubject) {
      e2FillType = this.m_SubjFillType;
      e2FillType2 = this.m_ClipFillType;
    } else {
      e2FillType = this.m_ClipFillType;
      e2FillType2 = this.m_SubjFillType;
    }
    var e1Wc, e2Wc;
    switch (e1FillType) {
      case ClipperLib2.PolyFillType.pftPositive:
        e1Wc = e1.WindCnt;
        break;
      case ClipperLib2.PolyFillType.pftNegative:
        e1Wc = -e1.WindCnt;
        break;
      default:
        e1Wc = Math.abs(e1.WindCnt);
        break;
    }
    switch (e2FillType) {
      case ClipperLib2.PolyFillType.pftPositive:
        e2Wc = e2.WindCnt;
        break;
      case ClipperLib2.PolyFillType.pftNegative:
        e2Wc = -e2.WindCnt;
        break;
      default:
        e2Wc = Math.abs(e2.WindCnt);
        break;
    }
    if (e1Contributing && e2Contributing) {
      if (e1Wc !== 0 && e1Wc !== 1 || e2Wc !== 0 && e2Wc !== 1 || e1.PolyTyp !== e2.PolyTyp && this.m_ClipType !== ClipperLib2.ClipType.ctXor) {
        this.AddLocalMaxPoly(e1, e2, pt);
      } else {
        this.AddOutPt(e1, pt);
        this.AddOutPt(e2, pt);
        ClipperLib2.Clipper.SwapSides(e1, e2);
        ClipperLib2.Clipper.SwapPolyIndexes(e1, e2);
      }
    } else if (e1Contributing) {
      if (e2Wc === 0 || e2Wc === 1) {
        this.AddOutPt(e1, pt);
        ClipperLib2.Clipper.SwapSides(e1, e2);
        ClipperLib2.Clipper.SwapPolyIndexes(e1, e2);
      }
    } else if (e2Contributing) {
      if (e1Wc === 0 || e1Wc === 1) {
        this.AddOutPt(e2, pt);
        ClipperLib2.Clipper.SwapSides(e1, e2);
        ClipperLib2.Clipper.SwapPolyIndexes(e1, e2);
      }
    } else if ((e1Wc === 0 || e1Wc === 1) && (e2Wc === 0 || e2Wc === 1)) {
      var e1Wc2, e2Wc2;
      switch (e1FillType2) {
        case ClipperLib2.PolyFillType.pftPositive:
          e1Wc2 = e1.WindCnt2;
          break;
        case ClipperLib2.PolyFillType.pftNegative:
          e1Wc2 = -e1.WindCnt2;
          break;
        default:
          e1Wc2 = Math.abs(e1.WindCnt2);
          break;
      }
      switch (e2FillType2) {
        case ClipperLib2.PolyFillType.pftPositive:
          e2Wc2 = e2.WindCnt2;
          break;
        case ClipperLib2.PolyFillType.pftNegative:
          e2Wc2 = -e2.WindCnt2;
          break;
        default:
          e2Wc2 = Math.abs(e2.WindCnt2);
          break;
      }
      if (e1.PolyTyp !== e2.PolyTyp) {
        this.AddLocalMinPoly(e1, e2, pt);
      } else if (e1Wc === 1 && e2Wc === 1)
        switch (this.m_ClipType) {
          case ClipperLib2.ClipType.ctIntersection:
            if (e1Wc2 > 0 && e2Wc2 > 0)
              this.AddLocalMinPoly(e1, e2, pt);
            break;
          case ClipperLib2.ClipType.ctUnion:
            if (e1Wc2 <= 0 && e2Wc2 <= 0)
              this.AddLocalMinPoly(e1, e2, pt);
            break;
          case ClipperLib2.ClipType.ctDifference:
            if (e1.PolyTyp === ClipperLib2.PolyType.ptClip && e1Wc2 > 0 && e2Wc2 > 0 || e1.PolyTyp === ClipperLib2.PolyType.ptSubject && e1Wc2 <= 0 && e2Wc2 <= 0)
              this.AddLocalMinPoly(e1, e2, pt);
            break;
          case ClipperLib2.ClipType.ctXor:
            this.AddLocalMinPoly(e1, e2, pt);
            break;
        }
      else
        ClipperLib2.Clipper.SwapSides(e1, e2);
    }
  };
  ClipperLib2.Clipper.prototype.DeleteFromSEL = function(e) {
    var SelPrev = e.PrevInSEL;
    var SelNext = e.NextInSEL;
    if (SelPrev === null && SelNext === null && e !== this.m_SortedEdges)
      return;
    if (SelPrev !== null)
      SelPrev.NextInSEL = SelNext;
    else
      this.m_SortedEdges = SelNext;
    if (SelNext !== null)
      SelNext.PrevInSEL = SelPrev;
    e.NextInSEL = null;
    e.PrevInSEL = null;
  };
  ClipperLib2.Clipper.prototype.ProcessHorizontals = function() {
    var horzEdge = {};
    while (this.PopEdgeFromSEL(horzEdge)) {
      this.ProcessHorizontal(horzEdge.v);
    }
  };
  ClipperLib2.Clipper.prototype.GetHorzDirection = function(HorzEdge, $var) {
    if (HorzEdge.Bot.X < HorzEdge.Top.X) {
      $var.Left = HorzEdge.Bot.X;
      $var.Right = HorzEdge.Top.X;
      $var.Dir = ClipperLib2.Direction.dLeftToRight;
    } else {
      $var.Left = HorzEdge.Top.X;
      $var.Right = HorzEdge.Bot.X;
      $var.Dir = ClipperLib2.Direction.dRightToLeft;
    }
  };
  ClipperLib2.Clipper.prototype.ProcessHorizontal = function(horzEdge) {
    var $var = {
      Dir: null,
      Left: null,
      Right: null
    };
    this.GetHorzDirection(horzEdge, $var);
    var dir = $var.Dir;
    var horzLeft = $var.Left;
    var horzRight = $var.Right;
    var IsOpen = horzEdge.WindDelta === 0;
    var eLastHorz = horzEdge, eMaxPair = null;
    while (eLastHorz.NextInLML !== null && ClipperLib2.ClipperBase.IsHorizontal(eLastHorz.NextInLML))
      eLastHorz = eLastHorz.NextInLML;
    if (eLastHorz.NextInLML === null)
      eMaxPair = this.GetMaximaPair(eLastHorz);
    var currMax = this.m_Maxima;
    if (currMax !== null) {
      if (dir === ClipperLib2.Direction.dLeftToRight) {
        while (currMax !== null && currMax.X <= horzEdge.Bot.X) {
          currMax = currMax.Next;
        }
        if (currMax !== null && currMax.X >= eLastHorz.Top.X) {
          currMax = null;
        }
      } else {
        while (currMax.Next !== null && currMax.Next.X < horzEdge.Bot.X) {
          currMax = currMax.Next;
        }
        if (currMax.X <= eLastHorz.Top.X) {
          currMax = null;
        }
      }
    }
    var op1 = null;
    for (; ; ) {
      var IsLastHorz = horzEdge === eLastHorz;
      var e = this.GetNextInAEL(horzEdge, dir);
      while (e !== null) {
        if (currMax !== null) {
          if (dir === ClipperLib2.Direction.dLeftToRight) {
            while (currMax !== null && currMax.X < e.Curr.X) {
              if (horzEdge.OutIdx >= 0 && !IsOpen) {
                this.AddOutPt(horzEdge, new ClipperLib2.IntPoint2(currMax.X, horzEdge.Bot.Y));
              }
              currMax = currMax.Next;
            }
          } else {
            while (currMax !== null && currMax.X > e.Curr.X) {
              if (horzEdge.OutIdx >= 0 && !IsOpen) {
                this.AddOutPt(horzEdge, new ClipperLib2.IntPoint2(currMax.X, horzEdge.Bot.Y));
              }
              currMax = currMax.Prev;
            }
          }
        }
        if (dir === ClipperLib2.Direction.dLeftToRight && e.Curr.X > horzRight || dir === ClipperLib2.Direction.dRightToLeft && e.Curr.X < horzLeft) {
          break;
        }
        if (e.Curr.X === horzEdge.Top.X && horzEdge.NextInLML !== null && e.Dx < horzEdge.NextInLML.Dx)
          break;
        if (horzEdge.OutIdx >= 0 && !IsOpen) {
          if (ClipperLib2.use_xyz) {
            if (dir === ClipperLib2.Direction.dLeftToRight)
              this.SetZ(e.Curr, horzEdge, e);
            else this.SetZ(e.Curr, e, horzEdge);
          }
          op1 = this.AddOutPt(horzEdge, e.Curr);
          var eNextHorz = this.m_SortedEdges;
          while (eNextHorz !== null) {
            if (eNextHorz.OutIdx >= 0 && this.HorzSegmentsOverlap(horzEdge.Bot.X, horzEdge.Top.X, eNextHorz.Bot.X, eNextHorz.Top.X)) {
              var op2 = this.GetLastOutPt(eNextHorz);
              this.AddJoin(op2, op1, eNextHorz.Top);
            }
            eNextHorz = eNextHorz.NextInSEL;
          }
          this.AddGhostJoin(op1, horzEdge.Bot);
        }
        if (e === eMaxPair && IsLastHorz) {
          if (horzEdge.OutIdx >= 0) {
            this.AddLocalMaxPoly(horzEdge, eMaxPair, horzEdge.Top);
          }
          this.DeleteFromAEL(horzEdge);
          this.DeleteFromAEL(eMaxPair);
          return;
        }
        if (dir === ClipperLib2.Direction.dLeftToRight) {
          var Pt = new ClipperLib2.IntPoint2(e.Curr.X, horzEdge.Curr.Y);
          this.IntersectEdges(horzEdge, e, Pt);
        } else {
          var Pt = new ClipperLib2.IntPoint2(e.Curr.X, horzEdge.Curr.Y);
          this.IntersectEdges(e, horzEdge, Pt);
        }
        var eNext = this.GetNextInAEL(e, dir);
        this.SwapPositionsInAEL(horzEdge, e);
        e = eNext;
      }
      if (horzEdge.NextInLML === null || !ClipperLib2.ClipperBase.IsHorizontal(horzEdge.NextInLML)) {
        break;
      }
      horzEdge = this.UpdateEdgeIntoAEL(horzEdge);
      if (horzEdge.OutIdx >= 0) {
        this.AddOutPt(horzEdge, horzEdge.Bot);
      }
      $var = {
        Dir: dir,
        Left: horzLeft,
        Right: horzRight
      };
      this.GetHorzDirection(horzEdge, $var);
      dir = $var.Dir;
      horzLeft = $var.Left;
      horzRight = $var.Right;
    }
    if (horzEdge.OutIdx >= 0 && op1 === null) {
      op1 = this.GetLastOutPt(horzEdge);
      var eNextHorz = this.m_SortedEdges;
      while (eNextHorz !== null) {
        if (eNextHorz.OutIdx >= 0 && this.HorzSegmentsOverlap(horzEdge.Bot.X, horzEdge.Top.X, eNextHorz.Bot.X, eNextHorz.Top.X)) {
          var op2 = this.GetLastOutPt(eNextHorz);
          this.AddJoin(op2, op1, eNextHorz.Top);
        }
        eNextHorz = eNextHorz.NextInSEL;
      }
      this.AddGhostJoin(op1, horzEdge.Top);
    }
    if (horzEdge.NextInLML !== null) {
      if (horzEdge.OutIdx >= 0) {
        op1 = this.AddOutPt(horzEdge, horzEdge.Top);
        horzEdge = this.UpdateEdgeIntoAEL(horzEdge);
        if (horzEdge.WindDelta === 0) {
          return;
        }
        var ePrev = horzEdge.PrevInAEL;
        var eNext = horzEdge.NextInAEL;
        if (ePrev !== null && ePrev.Curr.X === horzEdge.Bot.X && ePrev.Curr.Y === horzEdge.Bot.Y && ePrev.WindDelta === 0 && (ePrev.OutIdx >= 0 && ePrev.Curr.Y > ePrev.Top.Y && ClipperLib2.ClipperBase.SlopesEqual3(horzEdge, ePrev, this.m_UseFullRange))) {
          var op2 = this.AddOutPt(ePrev, horzEdge.Bot);
          this.AddJoin(op1, op2, horzEdge.Top);
        } else if (eNext !== null && eNext.Curr.X === horzEdge.Bot.X && eNext.Curr.Y === horzEdge.Bot.Y && eNext.WindDelta !== 0 && eNext.OutIdx >= 0 && eNext.Curr.Y > eNext.Top.Y && ClipperLib2.ClipperBase.SlopesEqual3(horzEdge, eNext, this.m_UseFullRange)) {
          var op2 = this.AddOutPt(eNext, horzEdge.Bot);
          this.AddJoin(op1, op2, horzEdge.Top);
        }
      } else {
        horzEdge = this.UpdateEdgeIntoAEL(horzEdge);
      }
    } else {
      if (horzEdge.OutIdx >= 0) {
        this.AddOutPt(horzEdge, horzEdge.Top);
      }
      this.DeleteFromAEL(horzEdge);
    }
  };
  ClipperLib2.Clipper.prototype.GetNextInAEL = function(e, Direction) {
    return Direction === ClipperLib2.Direction.dLeftToRight ? e.NextInAEL : e.PrevInAEL;
  };
  ClipperLib2.Clipper.prototype.IsMinima = function(e) {
    return e !== null && e.Prev.NextInLML !== e && e.Next.NextInLML !== e;
  };
  ClipperLib2.Clipper.prototype.IsMaxima = function(e, Y) {
    return e !== null && e.Top.Y === Y && e.NextInLML === null;
  };
  ClipperLib2.Clipper.prototype.IsIntermediate = function(e, Y) {
    return e.Top.Y === Y && e.NextInLML !== null;
  };
  ClipperLib2.Clipper.prototype.GetMaximaPair = function(e) {
    if (ClipperLib2.IntPoint.op_Equality(e.Next.Top, e.Top) && e.Next.NextInLML === null) {
      return e.Next;
    } else {
      if (ClipperLib2.IntPoint.op_Equality(e.Prev.Top, e.Top) && e.Prev.NextInLML === null) {
        return e.Prev;
      } else {
        return null;
      }
    }
  };
  ClipperLib2.Clipper.prototype.GetMaximaPairEx = function(e) {
    var result = this.GetMaximaPair(e);
    if (result === null || result.OutIdx === ClipperLib2.ClipperBase.Skip || result.NextInAEL === result.PrevInAEL && !ClipperLib2.ClipperBase.IsHorizontal(result)) {
      return null;
    }
    return result;
  };
  ClipperLib2.Clipper.prototype.ProcessIntersections = function(topY) {
    if (this.m_ActiveEdges === null)
      return true;
    try {
      this.BuildIntersectList(topY);
      if (this.m_IntersectList.length === 0)
        return true;
      if (this.m_IntersectList.length === 1 || this.FixupIntersectionOrder())
        this.ProcessIntersectList();
      else
        return false;
    } catch ($$e2) {
      this.m_SortedEdges = null;
      this.m_IntersectList.length = 0;
      ClipperLib2.Error("ProcessIntersections error");
    }
    this.m_SortedEdges = null;
    return true;
  };
  ClipperLib2.Clipper.prototype.BuildIntersectList = function(topY) {
    if (this.m_ActiveEdges === null)
      return;
    var e = this.m_ActiveEdges;
    this.m_SortedEdges = e;
    while (e !== null) {
      e.PrevInSEL = e.PrevInAEL;
      e.NextInSEL = e.NextInAEL;
      e.Curr.X = ClipperLib2.Clipper.TopX(e, topY);
      e = e.NextInAEL;
    }
    var isModified = true;
    while (isModified && this.m_SortedEdges !== null) {
      isModified = false;
      e = this.m_SortedEdges;
      while (e.NextInSEL !== null) {
        var eNext = e.NextInSEL;
        var pt = new ClipperLib2.IntPoint0();
        if (e.Curr.X > eNext.Curr.X) {
          this.IntersectPoint(e, eNext, pt);
          if (pt.Y < topY) {
            pt = new ClipperLib2.IntPoint2(ClipperLib2.Clipper.TopX(e, topY), topY);
          }
          var newNode = new ClipperLib2.IntersectNode();
          newNode.Edge1 = e;
          newNode.Edge2 = eNext;
          newNode.Pt.X = pt.X;
          newNode.Pt.Y = pt.Y;
          if (ClipperLib2.use_xyz) newNode.Pt.Z = pt.Z;
          this.m_IntersectList.push(newNode);
          this.SwapPositionsInSEL(e, eNext);
          isModified = true;
        } else
          e = eNext;
      }
      if (e.PrevInSEL !== null)
        e.PrevInSEL.NextInSEL = null;
      else
        break;
    }
    this.m_SortedEdges = null;
  };
  ClipperLib2.Clipper.prototype.EdgesAdjacent = function(inode) {
    return inode.Edge1.NextInSEL === inode.Edge2 || inode.Edge1.PrevInSEL === inode.Edge2;
  };
  ClipperLib2.Clipper.IntersectNodeSort = function(node1, node2) {
    return node2.Pt.Y - node1.Pt.Y;
  };
  ClipperLib2.Clipper.prototype.FixupIntersectionOrder = function() {
    this.m_IntersectList.sort(this.m_IntersectNodeComparer);
    this.CopyAELToSEL();
    var cnt = this.m_IntersectList.length;
    for (var i = 0; i < cnt; i++) {
      if (!this.EdgesAdjacent(this.m_IntersectList[i])) {
        var j = i + 1;
        while (j < cnt && !this.EdgesAdjacent(this.m_IntersectList[j]))
          j++;
        if (j === cnt)
          return false;
        var tmp = this.m_IntersectList[i];
        this.m_IntersectList[i] = this.m_IntersectList[j];
        this.m_IntersectList[j] = tmp;
      }
      this.SwapPositionsInSEL(this.m_IntersectList[i].Edge1, this.m_IntersectList[i].Edge2);
    }
    return true;
  };
  ClipperLib2.Clipper.prototype.ProcessIntersectList = function() {
    for (var i = 0, ilen = this.m_IntersectList.length; i < ilen; i++) {
      var iNode = this.m_IntersectList[i];
      this.IntersectEdges(iNode.Edge1, iNode.Edge2, iNode.Pt);
      this.SwapPositionsInAEL(iNode.Edge1, iNode.Edge2);
    }
    this.m_IntersectList.length = 0;
  };
  var R1 = function(a) {
    return a < 0 ? Math.ceil(a - 0.5) : Math.round(a);
  };
  var R2 = function(a) {
    return a < 0 ? Math.ceil(a - 0.5) : Math.floor(a + 0.5);
  };
  var R3 = function(a) {
    return a < 0 ? -Math.round(Math.abs(a)) : Math.round(a);
  };
  var R4 = function(a) {
    if (a < 0) {
      a -= 0.5;
      return a < -2147483648 ? Math.ceil(a) : a | 0;
    } else {
      a += 0.5;
      return a > 2147483647 ? Math.floor(a) : a | 0;
    }
  };
  if (browser.msie) ClipperLib2.Clipper.Round = R1;
  else if (browser.chromium) ClipperLib2.Clipper.Round = R3;
  else if (browser.safari) ClipperLib2.Clipper.Round = R4;
  else ClipperLib2.Clipper.Round = R2;
  ClipperLib2.Clipper.TopX = function(edge, currentY) {
    if (currentY === edge.Top.Y)
      return edge.Top.X;
    return edge.Bot.X + ClipperLib2.Clipper.Round(edge.Dx * (currentY - edge.Bot.Y));
  };
  ClipperLib2.Clipper.prototype.IntersectPoint = function(edge1, edge2, ip) {
    ip.X = 0;
    ip.Y = 0;
    var b1, b2;
    if (edge1.Dx === edge2.Dx) {
      ip.Y = edge1.Curr.Y;
      ip.X = ClipperLib2.Clipper.TopX(edge1, ip.Y);
      return;
    }
    if (edge1.Delta.X === 0) {
      ip.X = edge1.Bot.X;
      if (ClipperLib2.ClipperBase.IsHorizontal(edge2)) {
        ip.Y = edge2.Bot.Y;
      } else {
        b2 = edge2.Bot.Y - edge2.Bot.X / edge2.Dx;
        ip.Y = ClipperLib2.Clipper.Round(ip.X / edge2.Dx + b2);
      }
    } else if (edge2.Delta.X === 0) {
      ip.X = edge2.Bot.X;
      if (ClipperLib2.ClipperBase.IsHorizontal(edge1)) {
        ip.Y = edge1.Bot.Y;
      } else {
        b1 = edge1.Bot.Y - edge1.Bot.X / edge1.Dx;
        ip.Y = ClipperLib2.Clipper.Round(ip.X / edge1.Dx + b1);
      }
    } else {
      b1 = edge1.Bot.X - edge1.Bot.Y * edge1.Dx;
      b2 = edge2.Bot.X - edge2.Bot.Y * edge2.Dx;
      var q = (b2 - b1) / (edge1.Dx - edge2.Dx);
      ip.Y = ClipperLib2.Clipper.Round(q);
      if (Math.abs(edge1.Dx) < Math.abs(edge2.Dx))
        ip.X = ClipperLib2.Clipper.Round(edge1.Dx * q + b1);
      else
        ip.X = ClipperLib2.Clipper.Round(edge2.Dx * q + b2);
    }
    if (ip.Y < edge1.Top.Y || ip.Y < edge2.Top.Y) {
      if (edge1.Top.Y > edge2.Top.Y) {
        ip.Y = edge1.Top.Y;
        ip.X = ClipperLib2.Clipper.TopX(edge2, edge1.Top.Y);
        return ip.X < edge1.Top.X;
      } else
        ip.Y = edge2.Top.Y;
      if (Math.abs(edge1.Dx) < Math.abs(edge2.Dx))
        ip.X = ClipperLib2.Clipper.TopX(edge1, ip.Y);
      else
        ip.X = ClipperLib2.Clipper.TopX(edge2, ip.Y);
    }
    if (ip.Y > edge1.Curr.Y) {
      ip.Y = edge1.Curr.Y;
      if (Math.abs(edge1.Dx) > Math.abs(edge2.Dx))
        ip.X = ClipperLib2.Clipper.TopX(edge2, ip.Y);
      else
        ip.X = ClipperLib2.Clipper.TopX(edge1, ip.Y);
    }
  };
  ClipperLib2.Clipper.prototype.ProcessEdgesAtTopOfScanbeam = function(topY) {
    var e = this.m_ActiveEdges;
    while (e !== null) {
      var IsMaximaEdge = this.IsMaxima(e, topY);
      if (IsMaximaEdge) {
        var eMaxPair = this.GetMaximaPairEx(e);
        IsMaximaEdge = eMaxPair === null || !ClipperLib2.ClipperBase.IsHorizontal(eMaxPair);
      }
      if (IsMaximaEdge) {
        if (this.StrictlySimple) {
          this.InsertMaxima(e.Top.X);
        }
        var ePrev = e.PrevInAEL;
        this.DoMaxima(e);
        if (ePrev === null)
          e = this.m_ActiveEdges;
        else
          e = ePrev.NextInAEL;
      } else {
        if (this.IsIntermediate(e, topY) && ClipperLib2.ClipperBase.IsHorizontal(e.NextInLML)) {
          e = this.UpdateEdgeIntoAEL(e);
          if (e.OutIdx >= 0)
            this.AddOutPt(e, e.Bot);
          this.AddEdgeToSEL(e);
        } else {
          e.Curr.X = ClipperLib2.Clipper.TopX(e, topY);
          e.Curr.Y = topY;
        }
        if (ClipperLib2.use_xyz) {
          if (e.Top.Y === topY) e.Curr.Z = e.Top.Z;
          else if (e.Bot.Y === topY) e.Curr.Z = e.Bot.Z;
          else e.Curr.Z = 0;
        }
        if (this.StrictlySimple) {
          var ePrev = e.PrevInAEL;
          if (e.OutIdx >= 0 && e.WindDelta !== 0 && ePrev !== null && ePrev.OutIdx >= 0 && ePrev.Curr.X === e.Curr.X && ePrev.WindDelta !== 0) {
            var ip = new ClipperLib2.IntPoint1(e.Curr);
            if (ClipperLib2.use_xyz) {
              this.SetZ(ip, ePrev, e);
            }
            var op = this.AddOutPt(ePrev, ip);
            var op2 = this.AddOutPt(e, ip);
            this.AddJoin(op, op2, ip);
          }
        }
        e = e.NextInAEL;
      }
    }
    this.ProcessHorizontals();
    this.m_Maxima = null;
    e = this.m_ActiveEdges;
    while (e !== null) {
      if (this.IsIntermediate(e, topY)) {
        var op = null;
        if (e.OutIdx >= 0)
          op = this.AddOutPt(e, e.Top);
        e = this.UpdateEdgeIntoAEL(e);
        var ePrev = e.PrevInAEL;
        var eNext = e.NextInAEL;
        if (ePrev !== null && ePrev.Curr.X === e.Bot.X && ePrev.Curr.Y === e.Bot.Y && op !== null && ePrev.OutIdx >= 0 && ePrev.Curr.Y === ePrev.Top.Y && ClipperLib2.ClipperBase.SlopesEqual5(e.Curr, e.Top, ePrev.Curr, ePrev.Top, this.m_UseFullRange) && e.WindDelta !== 0 && ePrev.WindDelta !== 0) {
          var op2 = this.AddOutPt(ePrev2, e.Bot);
          this.AddJoin(op, op2, e.Top);
        } else if (eNext !== null && eNext.Curr.X === e.Bot.X && eNext.Curr.Y === e.Bot.Y && op !== null && eNext.OutIdx >= 0 && eNext.Curr.Y === eNext.Top.Y && ClipperLib2.ClipperBase.SlopesEqual5(e.Curr, e.Top, eNext.Curr, eNext.Top, this.m_UseFullRange) && e.WindDelta !== 0 && eNext.WindDelta !== 0) {
          var op2 = this.AddOutPt(eNext, e.Bot);
          this.AddJoin(op, op2, e.Top);
        }
      }
      e = e.NextInAEL;
    }
  };
  ClipperLib2.Clipper.prototype.DoMaxima = function(e) {
    var eMaxPair = this.GetMaximaPairEx(e);
    if (eMaxPair === null) {
      if (e.OutIdx >= 0)
        this.AddOutPt(e, e.Top);
      this.DeleteFromAEL(e);
      return;
    }
    var eNext = e.NextInAEL;
    while (eNext !== null && eNext !== eMaxPair) {
      this.IntersectEdges(e, eNext, e.Top);
      this.SwapPositionsInAEL(e, eNext);
      eNext = e.NextInAEL;
    }
    if (e.OutIdx === -1 && eMaxPair.OutIdx === -1) {
      this.DeleteFromAEL(e);
      this.DeleteFromAEL(eMaxPair);
    } else if (e.OutIdx >= 0 && eMaxPair.OutIdx >= 0) {
      if (e.OutIdx >= 0) this.AddLocalMaxPoly(e, eMaxPair, e.Top);
      this.DeleteFromAEL(e);
      this.DeleteFromAEL(eMaxPair);
    } else if (ClipperLib2.use_lines && e.WindDelta === 0) {
      if (e.OutIdx >= 0) {
        this.AddOutPt(e, e.Top);
        e.OutIdx = ClipperLib2.ClipperBase.Unassigned;
      }
      this.DeleteFromAEL(e);
      if (eMaxPair.OutIdx >= 0) {
        this.AddOutPt(eMaxPair, e.Top);
        eMaxPair.OutIdx = ClipperLib2.ClipperBase.Unassigned;
      }
      this.DeleteFromAEL(eMaxPair);
    } else
      ClipperLib2.Error("DoMaxima error");
  };
  ClipperLib2.Clipper.ReversePaths = function(polys) {
    for (var i = 0, len = polys.length; i < len; i++)
      polys[i].reverse();
  };
  ClipperLib2.Clipper.Orientation = function(poly) {
    return ClipperLib2.Clipper.Area(poly) >= 0;
  };
  ClipperLib2.Clipper.prototype.PointCount = function(pts) {
    if (pts === null)
      return 0;
    var result = 0;
    var p = pts;
    do {
      result++;
      p = p.Next;
    } while (p !== pts);
    return result;
  };
  ClipperLib2.Clipper.prototype.BuildResult = function(polyg) {
    ClipperLib2.Clear(polyg);
    for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++) {
      var outRec = this.m_PolyOuts[i];
      if (outRec.Pts === null)
        continue;
      var p = outRec.Pts.Prev;
      var cnt = this.PointCount(p);
      if (cnt < 2)
        continue;
      var pg = new Array(cnt);
      for (var j = 0; j < cnt; j++) {
        pg[j] = p.Pt;
        p = p.Prev;
      }
      polyg.push(pg);
    }
  };
  ClipperLib2.Clipper.prototype.BuildResult2 = function(polytree) {
    polytree.Clear();
    for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++) {
      var outRec = this.m_PolyOuts[i];
      var cnt = this.PointCount(outRec.Pts);
      if (outRec.IsOpen && cnt < 2 || !outRec.IsOpen && cnt < 3)
        continue;
      this.FixHoleLinkage(outRec);
      var pn = new ClipperLib2.PolyNode();
      polytree.m_AllPolys.push(pn);
      outRec.PolyNode = pn;
      pn.m_polygon.length = cnt;
      var op = outRec.Pts.Prev;
      for (var j = 0; j < cnt; j++) {
        pn.m_polygon[j] = op.Pt;
        op = op.Prev;
      }
    }
    for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++) {
      var outRec = this.m_PolyOuts[i];
      if (outRec.PolyNode === null)
        continue;
      else if (outRec.IsOpen) {
        outRec.PolyNode.IsOpen = true;
        polytree.AddChild(outRec.PolyNode);
      } else if (outRec.FirstLeft !== null && outRec.FirstLeft.PolyNode !== null)
        outRec.FirstLeft.PolyNode.AddChild(outRec.PolyNode);
      else
        polytree.AddChild(outRec.PolyNode);
    }
  };
  ClipperLib2.Clipper.prototype.FixupOutPolyline = function(outRec) {
    var pp = outRec.Pts;
    var lastPP = pp.Prev;
    while (pp !== lastPP) {
      pp = pp.Next;
      if (ClipperLib2.IntPoint.op_Equality(pp.Pt, pp.Prev.Pt)) {
        if (pp === lastPP) {
          lastPP = pp.Prev;
        }
        var tmpPP = pp.Prev;
        tmpPP.Next = pp.Next;
        pp.Next.Prev = tmpPP;
        pp = tmpPP;
      }
    }
    if (pp === pp.Prev) {
      outRec.Pts = null;
    }
  };
  ClipperLib2.Clipper.prototype.FixupOutPolygon = function(outRec) {
    var lastOK = null;
    outRec.BottomPt = null;
    var pp = outRec.Pts;
    var preserveCol = this.PreserveCollinear || this.StrictlySimple;
    for (; ; ) {
      if (pp.Prev === pp || pp.Prev === pp.Next) {
        outRec.Pts = null;
        return;
      }
      if (ClipperLib2.IntPoint.op_Equality(pp.Pt, pp.Next.Pt) || ClipperLib2.IntPoint.op_Equality(pp.Pt, pp.Prev.Pt) || ClipperLib2.ClipperBase.SlopesEqual4(pp.Prev.Pt, pp.Pt, pp.Next.Pt, this.m_UseFullRange) && (!preserveCol || !this.Pt2IsBetweenPt1AndPt3(pp.Prev.Pt, pp.Pt, pp.Next.Pt))) {
        lastOK = null;
        pp.Prev.Next = pp.Next;
        pp.Next.Prev = pp.Prev;
        pp = pp.Prev;
      } else if (pp === lastOK)
        break;
      else {
        if (lastOK === null)
          lastOK = pp;
        pp = pp.Next;
      }
    }
    outRec.Pts = pp;
  };
  ClipperLib2.Clipper.prototype.DupOutPt = function(outPt, InsertAfter) {
    var result = new ClipperLib2.OutPt();
    result.Pt.X = outPt.Pt.X;
    result.Pt.Y = outPt.Pt.Y;
    if (ClipperLib2.use_xyz) result.Pt.Z = outPt.Pt.Z;
    result.Idx = outPt.Idx;
    if (InsertAfter) {
      result.Next = outPt.Next;
      result.Prev = outPt;
      outPt.Next.Prev = result;
      outPt.Next = result;
    } else {
      result.Prev = outPt.Prev;
      result.Next = outPt;
      outPt.Prev.Next = result;
      outPt.Prev = result;
    }
    return result;
  };
  ClipperLib2.Clipper.prototype.GetOverlap = function(a1, a2, b1, b2, $val) {
    if (a1 < a2) {
      if (b1 < b2) {
        $val.Left = Math.max(a1, b1);
        $val.Right = Math.min(a2, b2);
      } else {
        $val.Left = Math.max(a1, b2);
        $val.Right = Math.min(a2, b1);
      }
    } else {
      if (b1 < b2) {
        $val.Left = Math.max(a2, b1);
        $val.Right = Math.min(a1, b2);
      } else {
        $val.Left = Math.max(a2, b2);
        $val.Right = Math.min(a1, b1);
      }
    }
    return $val.Left < $val.Right;
  };
  ClipperLib2.Clipper.prototype.JoinHorz = function(op1, op1b, op2, op2b, Pt, DiscardLeft) {
    var Dir1 = op1.Pt.X > op1b.Pt.X ? ClipperLib2.Direction.dRightToLeft : ClipperLib2.Direction.dLeftToRight;
    var Dir2 = op2.Pt.X > op2b.Pt.X ? ClipperLib2.Direction.dRightToLeft : ClipperLib2.Direction.dLeftToRight;
    if (Dir1 === Dir2)
      return false;
    if (Dir1 === ClipperLib2.Direction.dLeftToRight) {
      while (op1.Next.Pt.X <= Pt.X && op1.Next.Pt.X >= op1.Pt.X && op1.Next.Pt.Y === Pt.Y)
        op1 = op1.Next;
      if (DiscardLeft && op1.Pt.X !== Pt.X)
        op1 = op1.Next;
      op1b = this.DupOutPt(op1, !DiscardLeft);
      if (ClipperLib2.IntPoint.op_Inequality(op1b.Pt, Pt)) {
        op1 = op1b;
        op1.Pt.X = Pt.X;
        op1.Pt.Y = Pt.Y;
        if (ClipperLib2.use_xyz) op1.Pt.Z = Pt.Z;
        op1b = this.DupOutPt(op1, !DiscardLeft);
      }
    } else {
      while (op1.Next.Pt.X >= Pt.X && op1.Next.Pt.X <= op1.Pt.X && op1.Next.Pt.Y === Pt.Y)
        op1 = op1.Next;
      if (!DiscardLeft && op1.Pt.X !== Pt.X)
        op1 = op1.Next;
      op1b = this.DupOutPt(op1, DiscardLeft);
      if (ClipperLib2.IntPoint.op_Inequality(op1b.Pt, Pt)) {
        op1 = op1b;
        op1.Pt.X = Pt.X;
        op1.Pt.Y = Pt.Y;
        if (ClipperLib2.use_xyz) op1.Pt.Z = Pt.Z;
        op1b = this.DupOutPt(op1, DiscardLeft);
      }
    }
    if (Dir2 === ClipperLib2.Direction.dLeftToRight) {
      while (op2.Next.Pt.X <= Pt.X && op2.Next.Pt.X >= op2.Pt.X && op2.Next.Pt.Y === Pt.Y)
        op2 = op2.Next;
      if (DiscardLeft && op2.Pt.X !== Pt.X)
        op2 = op2.Next;
      op2b = this.DupOutPt(op2, !DiscardLeft);
      if (ClipperLib2.IntPoint.op_Inequality(op2b.Pt, Pt)) {
        op2 = op2b;
        op2.Pt.X = Pt.X;
        op2.Pt.Y = Pt.Y;
        if (ClipperLib2.use_xyz) op2.Pt.Z = Pt.Z;
        op2b = this.DupOutPt(op2, !DiscardLeft);
      }
    } else {
      while (op2.Next.Pt.X >= Pt.X && op2.Next.Pt.X <= op2.Pt.X && op2.Next.Pt.Y === Pt.Y)
        op2 = op2.Next;
      if (!DiscardLeft && op2.Pt.X !== Pt.X)
        op2 = op2.Next;
      op2b = this.DupOutPt(op2, DiscardLeft);
      if (ClipperLib2.IntPoint.op_Inequality(op2b.Pt, Pt)) {
        op2 = op2b;
        op2.Pt.X = Pt.X;
        op2.Pt.Y = Pt.Y;
        if (ClipperLib2.use_xyz) op2.Pt.Z = Pt.Z;
        op2b = this.DupOutPt(op2, DiscardLeft);
      }
    }
    if (Dir1 === ClipperLib2.Direction.dLeftToRight === DiscardLeft) {
      op1.Prev = op2;
      op2.Next = op1;
      op1b.Next = op2b;
      op2b.Prev = op1b;
    } else {
      op1.Next = op2;
      op2.Prev = op1;
      op1b.Prev = op2b;
      op2b.Next = op1b;
    }
    return true;
  };
  ClipperLib2.Clipper.prototype.JoinPoints = function(j, outRec1, outRec2) {
    var op1 = j.OutPt1, op1b = new ClipperLib2.OutPt();
    var op2 = j.OutPt2, op2b = new ClipperLib2.OutPt();
    var isHorizontal = j.OutPt1.Pt.Y === j.OffPt.Y;
    if (isHorizontal && ClipperLib2.IntPoint.op_Equality(j.OffPt, j.OutPt1.Pt) && ClipperLib2.IntPoint.op_Equality(j.OffPt, j.OutPt2.Pt)) {
      if (outRec1 !== outRec2) return false;
      op1b = j.OutPt1.Next;
      while (op1b !== op1 && ClipperLib2.IntPoint.op_Equality(op1b.Pt, j.OffPt))
        op1b = op1b.Next;
      var reverse1 = op1b.Pt.Y > j.OffPt.Y;
      op2b = j.OutPt2.Next;
      while (op2b !== op2 && ClipperLib2.IntPoint.op_Equality(op2b.Pt, j.OffPt))
        op2b = op2b.Next;
      var reverse2 = op2b.Pt.Y > j.OffPt.Y;
      if (reverse1 === reverse2)
        return false;
      if (reverse1) {
        op1b = this.DupOutPt(op1, false);
        op2b = this.DupOutPt(op2, true);
        op1.Prev = op2;
        op2.Next = op1;
        op1b.Next = op2b;
        op2b.Prev = op1b;
        j.OutPt1 = op1;
        j.OutPt2 = op1b;
        return true;
      } else {
        op1b = this.DupOutPt(op1, true);
        op2b = this.DupOutPt(op2, false);
        op1.Next = op2;
        op2.Prev = op1;
        op1b.Prev = op2b;
        op2b.Next = op1b;
        j.OutPt1 = op1;
        j.OutPt2 = op1b;
        return true;
      }
    } else if (isHorizontal) {
      op1b = op1;
      while (op1.Prev.Pt.Y === op1.Pt.Y && op1.Prev !== op1b && op1.Prev !== op2)
        op1 = op1.Prev;
      while (op1b.Next.Pt.Y === op1b.Pt.Y && op1b.Next !== op1 && op1b.Next !== op2)
        op1b = op1b.Next;
      if (op1b.Next === op1 || op1b.Next === op2)
        return false;
      op2b = op2;
      while (op2.Prev.Pt.Y === op2.Pt.Y && op2.Prev !== op2b && op2.Prev !== op1b)
        op2 = op2.Prev;
      while (op2b.Next.Pt.Y === op2b.Pt.Y && op2b.Next !== op2 && op2b.Next !== op1)
        op2b = op2b.Next;
      if (op2b.Next === op2 || op2b.Next === op1)
        return false;
      var $val = {
        Left: null,
        Right: null
      };
      if (!this.GetOverlap(op1.Pt.X, op1b.Pt.X, op2.Pt.X, op2b.Pt.X, $val))
        return false;
      var Left = $val.Left;
      var Right = $val.Right;
      var Pt = new ClipperLib2.IntPoint0();
      var DiscardLeftSide;
      if (op1.Pt.X >= Left && op1.Pt.X <= Right) {
        Pt.X = op1.Pt.X;
        Pt.Y = op1.Pt.Y;
        if (ClipperLib2.use_xyz) Pt.Z = op1.Pt.Z;
        DiscardLeftSide = op1.Pt.X > op1b.Pt.X;
      } else if (op2.Pt.X >= Left && op2.Pt.X <= Right) {
        Pt.X = op2.Pt.X;
        Pt.Y = op2.Pt.Y;
        if (ClipperLib2.use_xyz) Pt.Z = op2.Pt.Z;
        DiscardLeftSide = op2.Pt.X > op2b.Pt.X;
      } else if (op1b.Pt.X >= Left && op1b.Pt.X <= Right) {
        Pt.X = op1b.Pt.X;
        Pt.Y = op1b.Pt.Y;
        if (ClipperLib2.use_xyz) Pt.Z = op1b.Pt.Z;
        DiscardLeftSide = op1b.Pt.X > op1.Pt.X;
      } else {
        Pt.X = op2b.Pt.X;
        Pt.Y = op2b.Pt.Y;
        if (ClipperLib2.use_xyz) Pt.Z = op2b.Pt.Z;
        DiscardLeftSide = op2b.Pt.X > op2.Pt.X;
      }
      j.OutPt1 = op1;
      j.OutPt2 = op2;
      return this.JoinHorz(op1, op1b, op2, op2b, Pt, DiscardLeftSide);
    } else {
      op1b = op1.Next;
      while (ClipperLib2.IntPoint.op_Equality(op1b.Pt, op1.Pt) && op1b !== op1)
        op1b = op1b.Next;
      var Reverse1 = op1b.Pt.Y > op1.Pt.Y || !ClipperLib2.ClipperBase.SlopesEqual4(op1.Pt, op1b.Pt, j.OffPt, this.m_UseFullRange);
      if (Reverse1) {
        op1b = op1.Prev;
        while (ClipperLib2.IntPoint.op_Equality(op1b.Pt, op1.Pt) && op1b !== op1)
          op1b = op1b.Prev;
        if (op1b.Pt.Y > op1.Pt.Y || !ClipperLib2.ClipperBase.SlopesEqual4(op1.Pt, op1b.Pt, j.OffPt, this.m_UseFullRange))
          return false;
      }
      op2b = op2.Next;
      while (ClipperLib2.IntPoint.op_Equality(op2b.Pt, op2.Pt) && op2b !== op2)
        op2b = op2b.Next;
      var Reverse2 = op2b.Pt.Y > op2.Pt.Y || !ClipperLib2.ClipperBase.SlopesEqual4(op2.Pt, op2b.Pt, j.OffPt, this.m_UseFullRange);
      if (Reverse2) {
        op2b = op2.Prev;
        while (ClipperLib2.IntPoint.op_Equality(op2b.Pt, op2.Pt) && op2b !== op2)
          op2b = op2b.Prev;
        if (op2b.Pt.Y > op2.Pt.Y || !ClipperLib2.ClipperBase.SlopesEqual4(op2.Pt, op2b.Pt, j.OffPt, this.m_UseFullRange))
          return false;
      }
      if (op1b === op1 || op2b === op2 || op1b === op2b || outRec1 === outRec2 && Reverse1 === Reverse2)
        return false;
      if (Reverse1) {
        op1b = this.DupOutPt(op1, false);
        op2b = this.DupOutPt(op2, true);
        op1.Prev = op2;
        op2.Next = op1;
        op1b.Next = op2b;
        op2b.Prev = op1b;
        j.OutPt1 = op1;
        j.OutPt2 = op1b;
        return true;
      } else {
        op1b = this.DupOutPt(op1, true);
        op2b = this.DupOutPt(op2, false);
        op1.Next = op2;
        op2.Prev = op1;
        op1b.Prev = op2b;
        op2b.Next = op1b;
        j.OutPt1 = op1;
        j.OutPt2 = op1b;
        return true;
      }
    }
  };
  ClipperLib2.Clipper.GetBounds = function(paths) {
    var i = 0, cnt = paths.length;
    while (i < cnt && paths[i].length === 0) i++;
    if (i === cnt) return new ClipperLib2.IntRect(0, 0, 0, 0);
    var result = new ClipperLib2.IntRect();
    result.left = paths[i][0].X;
    result.right = result.left;
    result.top = paths[i][0].Y;
    result.bottom = result.top;
    for (; i < cnt; i++)
      for (var j = 0, jlen = paths[i].length; j < jlen; j++) {
        if (paths[i][j].X < result.left) result.left = paths[i][j].X;
        else if (paths[i][j].X > result.right) result.right = paths[i][j].X;
        if (paths[i][j].Y < result.top) result.top = paths[i][j].Y;
        else if (paths[i][j].Y > result.bottom) result.bottom = paths[i][j].Y;
      }
    return result;
  };
  ClipperLib2.Clipper.prototype.GetBounds2 = function(ops) {
    var opStart = ops;
    var result = new ClipperLib2.IntRect();
    result.left = ops.Pt.X;
    result.right = ops.Pt.X;
    result.top = ops.Pt.Y;
    result.bottom = ops.Pt.Y;
    ops = ops.Next;
    while (ops !== opStart) {
      if (ops.Pt.X < result.left)
        result.left = ops.Pt.X;
      if (ops.Pt.X > result.right)
        result.right = ops.Pt.X;
      if (ops.Pt.Y < result.top)
        result.top = ops.Pt.Y;
      if (ops.Pt.Y > result.bottom)
        result.bottom = ops.Pt.Y;
      ops = ops.Next;
    }
    return result;
  };
  ClipperLib2.Clipper.PointInPolygon = function(pt, path) {
    var result = 0, cnt = path.length;
    if (cnt < 3)
      return 0;
    var ip = path[0];
    for (var i = 1; i <= cnt; ++i) {
      var ipNext = i === cnt ? path[0] : path[i];
      if (ipNext.Y === pt.Y) {
        if (ipNext.X === pt.X || ip.Y === pt.Y && ipNext.X > pt.X === ip.X < pt.X)
          return -1;
      }
      if (ip.Y < pt.Y !== ipNext.Y < pt.Y) {
        if (ip.X >= pt.X) {
          if (ipNext.X > pt.X)
            result = 1 - result;
          else {
            var d = (ip.X - pt.X) * (ipNext.Y - pt.Y) - (ipNext.X - pt.X) * (ip.Y - pt.Y);
            if (d === 0)
              return -1;
            else if (d > 0 === ipNext.Y > ip.Y)
              result = 1 - result;
          }
        } else {
          if (ipNext.X > pt.X) {
            var d = (ip.X - pt.X) * (ipNext.Y - pt.Y) - (ipNext.X - pt.X) * (ip.Y - pt.Y);
            if (d === 0)
              return -1;
            else if (d > 0 === ipNext.Y > ip.Y)
              result = 1 - result;
          }
        }
      }
      ip = ipNext;
    }
    return result;
  };
  ClipperLib2.Clipper.prototype.PointInPolygon = function(pt, op) {
    var result = 0;
    var startOp = op;
    var ptx = pt.X, pty = pt.Y;
    var poly0x = op.Pt.X, poly0y = op.Pt.Y;
    do {
      op = op.Next;
      var poly1x = op.Pt.X, poly1y = op.Pt.Y;
      if (poly1y === pty) {
        if (poly1x === ptx || poly0y === pty && poly1x > ptx === poly0x < ptx)
          return -1;
      }
      if (poly0y < pty !== poly1y < pty) {
        if (poly0x >= ptx) {
          if (poly1x > ptx)
            result = 1 - result;
          else {
            var d = (poly0x - ptx) * (poly1y - pty) - (poly1x - ptx) * (poly0y - pty);
            if (d === 0)
              return -1;
            if (d > 0 === poly1y > poly0y)
              result = 1 - result;
          }
        } else {
          if (poly1x > ptx) {
            var d = (poly0x - ptx) * (poly1y - pty) - (poly1x - ptx) * (poly0y - pty);
            if (d === 0)
              return -1;
            if (d > 0 === poly1y > poly0y)
              result = 1 - result;
          }
        }
      }
      poly0x = poly1x;
      poly0y = poly1y;
    } while (startOp !== op);
    return result;
  };
  ClipperLib2.Clipper.prototype.Poly2ContainsPoly1 = function(outPt1, outPt2) {
    var op = outPt1;
    do {
      var res = this.PointInPolygon(op.Pt, outPt2);
      if (res >= 0)
        return res > 0;
      op = op.Next;
    } while (op !== outPt1);
    return true;
  };
  ClipperLib2.Clipper.prototype.FixupFirstLefts1 = function(OldOutRec, NewOutRec) {
    var outRec, firstLeft;
    for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++) {
      outRec = this.m_PolyOuts[i];
      firstLeft = ClipperLib2.Clipper.ParseFirstLeft(outRec.FirstLeft);
      if (outRec.Pts !== null && firstLeft === OldOutRec) {
        if (this.Poly2ContainsPoly1(outRec.Pts, NewOutRec.Pts))
          outRec.FirstLeft = NewOutRec;
      }
    }
  };
  ClipperLib2.Clipper.prototype.FixupFirstLefts2 = function(innerOutRec, outerOutRec) {
    var orfl = outerOutRec.FirstLeft;
    var outRec, firstLeft;
    for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++) {
      outRec = this.m_PolyOuts[i];
      if (outRec.Pts === null || outRec === outerOutRec || outRec === innerOutRec)
        continue;
      firstLeft = ClipperLib2.Clipper.ParseFirstLeft(outRec.FirstLeft);
      if (firstLeft !== orfl && firstLeft !== innerOutRec && firstLeft !== outerOutRec)
        continue;
      if (this.Poly2ContainsPoly1(outRec.Pts, innerOutRec.Pts))
        outRec.FirstLeft = innerOutRec;
      else if (this.Poly2ContainsPoly1(outRec.Pts, outerOutRec.Pts))
        outRec.FirstLeft = outerOutRec;
      else if (outRec.FirstLeft === innerOutRec || outRec.FirstLeft === outerOutRec)
        outRec.FirstLeft = orfl;
    }
  };
  ClipperLib2.Clipper.prototype.FixupFirstLefts3 = function(OldOutRec, NewOutRec) {
    var outRec;
    var firstLeft;
    for (var i = 0, ilen = this.m_PolyOuts.length; i < ilen; i++) {
      outRec = this.m_PolyOuts[i];
      firstLeft = ClipperLib2.Clipper.ParseFirstLeft(outRec.FirstLeft);
      if (outRec.Pts !== null && firstLeft === OldOutRec)
        outRec.FirstLeft = NewOutRec;
    }
  };
  ClipperLib2.Clipper.ParseFirstLeft = function(FirstLeft) {
    while (FirstLeft !== null && FirstLeft.Pts === null)
      FirstLeft = FirstLeft.FirstLeft;
    return FirstLeft;
  };
  ClipperLib2.Clipper.prototype.JoinCommonEdges = function() {
    for (var i = 0, ilen = this.m_Joins.length; i < ilen; i++) {
      var join = this.m_Joins[i];
      var outRec1 = this.GetOutRec(join.OutPt1.Idx);
      var outRec2 = this.GetOutRec(join.OutPt2.Idx);
      if (outRec1.Pts === null || outRec2.Pts === null)
        continue;
      if (outRec1.IsOpen || outRec2.IsOpen) {
        continue;
      }
      var holeStateRec;
      if (outRec1 === outRec2)
        holeStateRec = outRec1;
      else if (this.OutRec1RightOfOutRec2(outRec1, outRec2))
        holeStateRec = outRec2;
      else if (this.OutRec1RightOfOutRec2(outRec2, outRec1))
        holeStateRec = outRec1;
      else
        holeStateRec = this.GetLowermostRec(outRec1, outRec2);
      if (!this.JoinPoints(join, outRec1, outRec2)) continue;
      if (outRec1 === outRec2) {
        outRec1.Pts = join.OutPt1;
        outRec1.BottomPt = null;
        outRec2 = this.CreateOutRec();
        outRec2.Pts = join.OutPt2;
        this.UpdateOutPtIdxs(outRec2);
        if (this.Poly2ContainsPoly1(outRec2.Pts, outRec1.Pts)) {
          outRec2.IsHole = !outRec1.IsHole;
          outRec2.FirstLeft = outRec1;
          if (this.m_UsingPolyTree)
            this.FixupFirstLefts2(outRec2, outRec1);
          if ((outRec2.IsHole ^ this.ReverseSolution) == this.Area$1(outRec2) > 0)
            this.ReversePolyPtLinks(outRec2.Pts);
        } else if (this.Poly2ContainsPoly1(outRec1.Pts, outRec2.Pts)) {
          outRec2.IsHole = outRec1.IsHole;
          outRec1.IsHole = !outRec2.IsHole;
          outRec2.FirstLeft = outRec1.FirstLeft;
          outRec1.FirstLeft = outRec2;
          if (this.m_UsingPolyTree)
            this.FixupFirstLefts2(outRec1, outRec2);
          if ((outRec1.IsHole ^ this.ReverseSolution) == this.Area$1(outRec1) > 0)
            this.ReversePolyPtLinks(outRec1.Pts);
        } else {
          outRec2.IsHole = outRec1.IsHole;
          outRec2.FirstLeft = outRec1.FirstLeft;
          if (this.m_UsingPolyTree)
            this.FixupFirstLefts1(outRec1, outRec2);
        }
      } else {
        outRec2.Pts = null;
        outRec2.BottomPt = null;
        outRec2.Idx = outRec1.Idx;
        outRec1.IsHole = holeStateRec.IsHole;
        if (holeStateRec === outRec2)
          outRec1.FirstLeft = outRec2.FirstLeft;
        outRec2.FirstLeft = outRec1;
        if (this.m_UsingPolyTree)
          this.FixupFirstLefts3(outRec2, outRec1);
      }
    }
  };
  ClipperLib2.Clipper.prototype.UpdateOutPtIdxs = function(outrec) {
    var op = outrec.Pts;
    do {
      op.Idx = outrec.Idx;
      op = op.Prev;
    } while (op !== outrec.Pts);
  };
  ClipperLib2.Clipper.prototype.DoSimplePolygons = function() {
    var i = 0;
    while (i < this.m_PolyOuts.length) {
      var outrec = this.m_PolyOuts[i++];
      var op = outrec.Pts;
      if (op === null || outrec.IsOpen)
        continue;
      do {
        var op2 = op.Next;
        while (op2 !== outrec.Pts) {
          if (ClipperLib2.IntPoint.op_Equality(op.Pt, op2.Pt) && op2.Next !== op && op2.Prev !== op) {
            var op3 = op.Prev;
            var op4 = op2.Prev;
            op.Prev = op4;
            op4.Next = op;
            op2.Prev = op3;
            op3.Next = op2;
            outrec.Pts = op;
            var outrec2 = this.CreateOutRec();
            outrec2.Pts = op2;
            this.UpdateOutPtIdxs(outrec2);
            if (this.Poly2ContainsPoly1(outrec2.Pts, outrec.Pts)) {
              outrec2.IsHole = !outrec.IsHole;
              outrec2.FirstLeft = outrec;
              if (this.m_UsingPolyTree) this.FixupFirstLefts2(outrec2, outrec);
            } else if (this.Poly2ContainsPoly1(outrec.Pts, outrec2.Pts)) {
              outrec2.IsHole = outrec.IsHole;
              outrec.IsHole = !outrec2.IsHole;
              outrec2.FirstLeft = outrec.FirstLeft;
              outrec.FirstLeft = outrec2;
              if (this.m_UsingPolyTree) this.FixupFirstLefts2(outrec, outrec2);
            } else {
              outrec2.IsHole = outrec.IsHole;
              outrec2.FirstLeft = outrec.FirstLeft;
              if (this.m_UsingPolyTree) this.FixupFirstLefts1(outrec, outrec2);
            }
            op2 = op;
          }
          op2 = op2.Next;
        }
        op = op.Next;
      } while (op !== outrec.Pts);
    }
  };
  ClipperLib2.Clipper.Area = function(poly) {
    if (!Array.isArray(poly))
      return 0;
    var cnt = poly.length;
    if (cnt < 3)
      return 0;
    var a = 0;
    for (var i = 0, j = cnt - 1; i < cnt; ++i) {
      a += (poly[j].X + poly[i].X) * (poly[j].Y - poly[i].Y);
      j = i;
    }
    return -a * 0.5;
  };
  ClipperLib2.Clipper.prototype.Area = function(op) {
    var opFirst = op;
    if (op === null) return 0;
    var a = 0;
    do {
      a = a + (op.Prev.Pt.X + op.Pt.X) * (op.Prev.Pt.Y - op.Pt.Y);
      op = op.Next;
    } while (op !== opFirst);
    return a * 0.5;
  };
  ClipperLib2.Clipper.prototype.Area$1 = function(outRec) {
    return this.Area(outRec.Pts);
  };
  ClipperLib2.Clipper.SimplifyPolygon = function(poly, fillType) {
    var result = new Array();
    var c = new ClipperLib2.Clipper(0);
    c.StrictlySimple = true;
    c.AddPath(poly, ClipperLib2.PolyType.ptSubject, true);
    c.Execute(ClipperLib2.ClipType.ctUnion, result, fillType, fillType);
    return result;
  };
  ClipperLib2.Clipper.SimplifyPolygons = function(polys, fillType) {
    if (typeof fillType === "undefined") fillType = ClipperLib2.PolyFillType.pftEvenOdd;
    var result = new Array();
    var c = new ClipperLib2.Clipper(0);
    c.StrictlySimple = true;
    c.AddPaths(polys, ClipperLib2.PolyType.ptSubject, true);
    c.Execute(ClipperLib2.ClipType.ctUnion, result, fillType, fillType);
    return result;
  };
  ClipperLib2.Clipper.DistanceSqrd = function(pt1, pt2) {
    var dx = pt1.X - pt2.X;
    var dy = pt1.Y - pt2.Y;
    return dx * dx + dy * dy;
  };
  ClipperLib2.Clipper.DistanceFromLineSqrd = function(pt, ln1, ln2) {
    var A = ln1.Y - ln2.Y;
    var B = ln2.X - ln1.X;
    var C = A * ln1.X + B * ln1.Y;
    C = A * pt.X + B * pt.Y - C;
    return C * C / (A * A + B * B);
  };
  ClipperLib2.Clipper.SlopesNearCollinear = function(pt1, pt2, pt3, distSqrd) {
    if (Math.abs(pt1.X - pt2.X) > Math.abs(pt1.Y - pt2.Y)) {
      if (pt1.X > pt2.X === pt1.X < pt3.X)
        return ClipperLib2.Clipper.DistanceFromLineSqrd(pt1, pt2, pt3) < distSqrd;
      else if (pt2.X > pt1.X === pt2.X < pt3.X)
        return ClipperLib2.Clipper.DistanceFromLineSqrd(pt2, pt1, pt3) < distSqrd;
      else
        return ClipperLib2.Clipper.DistanceFromLineSqrd(pt3, pt1, pt2) < distSqrd;
    } else {
      if (pt1.Y > pt2.Y === pt1.Y < pt3.Y)
        return ClipperLib2.Clipper.DistanceFromLineSqrd(pt1, pt2, pt3) < distSqrd;
      else if (pt2.Y > pt1.Y === pt2.Y < pt3.Y)
        return ClipperLib2.Clipper.DistanceFromLineSqrd(pt2, pt1, pt3) < distSqrd;
      else
        return ClipperLib2.Clipper.DistanceFromLineSqrd(pt3, pt1, pt2) < distSqrd;
    }
  };
  ClipperLib2.Clipper.PointsAreClose = function(pt1, pt2, distSqrd) {
    var dx = pt1.X - pt2.X;
    var dy = pt1.Y - pt2.Y;
    return dx * dx + dy * dy <= distSqrd;
  };
  ClipperLib2.Clipper.ExcludeOp = function(op) {
    var result = op.Prev;
    result.Next = op.Next;
    op.Next.Prev = result;
    result.Idx = 0;
    return result;
  };
  ClipperLib2.Clipper.CleanPolygon = function(path, distance) {
    if (typeof distance === "undefined") distance = 1.415;
    var cnt = path.length;
    if (cnt === 0)
      return new Array();
    var outPts = new Array(cnt);
    for (var i = 0; i < cnt; ++i)
      outPts[i] = new ClipperLib2.OutPt();
    for (var i = 0; i < cnt; ++i) {
      outPts[i].Pt = path[i];
      outPts[i].Next = outPts[(i + 1) % cnt];
      outPts[i].Next.Prev = outPts[i];
      outPts[i].Idx = 0;
    }
    var distSqrd = distance * distance;
    var op = outPts[0];
    while (op.Idx === 0 && op.Next !== op.Prev) {
      if (ClipperLib2.Clipper.PointsAreClose(op.Pt, op.Prev.Pt, distSqrd)) {
        op = ClipperLib2.Clipper.ExcludeOp(op);
        cnt--;
      } else if (ClipperLib2.Clipper.PointsAreClose(op.Prev.Pt, op.Next.Pt, distSqrd)) {
        ClipperLib2.Clipper.ExcludeOp(op.Next);
        op = ClipperLib2.Clipper.ExcludeOp(op);
        cnt -= 2;
      } else if (ClipperLib2.Clipper.SlopesNearCollinear(op.Prev.Pt, op.Pt, op.Next.Pt, distSqrd)) {
        op = ClipperLib2.Clipper.ExcludeOp(op);
        cnt--;
      } else {
        op.Idx = 1;
        op = op.Next;
      }
    }
    if (cnt < 3)
      cnt = 0;
    var result = new Array(cnt);
    for (var i = 0; i < cnt; ++i) {
      result[i] = new ClipperLib2.IntPoint1(op.Pt);
      op = op.Next;
    }
    outPts = null;
    return result;
  };
  ClipperLib2.Clipper.CleanPolygons = function(polys, distance) {
    var result = new Array(polys.length);
    for (var i = 0, ilen = polys.length; i < ilen; i++)
      result[i] = ClipperLib2.Clipper.CleanPolygon(polys[i], distance);
    return result;
  };
  ClipperLib2.Clipper.Minkowski = function(pattern, path, IsSum, IsClosed) {
    var delta = IsClosed ? 1 : 0;
    var polyCnt = pattern.length;
    var pathCnt = path.length;
    var result = new Array();
    if (IsSum)
      for (var i = 0; i < pathCnt; i++) {
        var p = new Array(polyCnt);
        for (var j = 0, jlen = pattern.length, ip = pattern[j]; j < jlen; j++, ip = pattern[j])
          p[j] = new ClipperLib2.IntPoint2(path[i].X + ip.X, path[i].Y + ip.Y);
        result.push(p);
      }
    else
      for (var i = 0; i < pathCnt; i++) {
        var p = new Array(polyCnt);
        for (var j = 0, jlen = pattern.length, ip = pattern[j]; j < jlen; j++, ip = pattern[j])
          p[j] = new ClipperLib2.IntPoint2(path[i].X - ip.X, path[i].Y - ip.Y);
        result.push(p);
      }
    var quads = new Array();
    for (var i = 0; i < pathCnt - 1 + delta; i++)
      for (var j = 0; j < polyCnt; j++) {
        var quad = new Array();
        quad.push(result[i % pathCnt][j % polyCnt]);
        quad.push(result[(i + 1) % pathCnt][j % polyCnt]);
        quad.push(result[(i + 1) % pathCnt][(j + 1) % polyCnt]);
        quad.push(result[i % pathCnt][(j + 1) % polyCnt]);
        if (!ClipperLib2.Clipper.Orientation(quad))
          quad.reverse();
        quads.push(quad);
      }
    return quads;
  };
  ClipperLib2.Clipper.MinkowskiSum = function(pattern, path_or_paths, pathIsClosed) {
    if (!(path_or_paths[0] instanceof Array)) {
      var path = path_or_paths;
      var paths = ClipperLib2.Clipper.Minkowski(pattern, path, true, pathIsClosed);
      var c = new ClipperLib2.Clipper();
      c.AddPaths(paths, ClipperLib2.PolyType.ptSubject, true);
      c.Execute(ClipperLib2.ClipType.ctUnion, paths, ClipperLib2.PolyFillType.pftNonZero, ClipperLib2.PolyFillType.pftNonZero);
      return paths;
    } else {
      var paths = path_or_paths;
      var solution = new ClipperLib2.Paths();
      var c = new ClipperLib2.Clipper();
      for (var i = 0; i < paths.length; ++i) {
        var tmp = ClipperLib2.Clipper.Minkowski(pattern, paths[i], true, pathIsClosed);
        c.AddPaths(tmp, ClipperLib2.PolyType.ptSubject, true);
        if (pathIsClosed) {
          var path = ClipperLib2.Clipper.TranslatePath(paths[i], pattern[0]);
          c.AddPath(path, ClipperLib2.PolyType.ptClip, true);
        }
      }
      c.Execute(
        ClipperLib2.ClipType.ctUnion,
        solution,
        ClipperLib2.PolyFillType.pftNonZero,
        ClipperLib2.PolyFillType.pftNonZero
      );
      return solution;
    }
  };
  ClipperLib2.Clipper.TranslatePath = function(path, delta) {
    var outPath = new ClipperLib2.Path();
    for (var i = 0; i < path.length; i++)
      outPath.push(new ClipperLib2.IntPoint2(path[i].X + delta.X, path[i].Y + delta.Y));
    return outPath;
  };
  ClipperLib2.Clipper.MinkowskiDiff = function(poly1, poly2) {
    var paths = ClipperLib2.Clipper.Minkowski(poly1, poly2, false, true);
    var c = new ClipperLib2.Clipper();
    c.AddPaths(paths, ClipperLib2.PolyType.ptSubject, true);
    c.Execute(ClipperLib2.ClipType.ctUnion, paths, ClipperLib2.PolyFillType.pftNonZero, ClipperLib2.PolyFillType.pftNonZero);
    return paths;
  };
  ClipperLib2.Clipper.PolyTreeToPaths = function(polytree) {
    var result = new Array();
    ClipperLib2.Clipper.AddPolyNodeToPaths(polytree, ClipperLib2.Clipper.NodeType.ntAny, result);
    return result;
  };
  ClipperLib2.Clipper.AddPolyNodeToPaths = function(polynode, nt, paths) {
    var match = true;
    switch (nt) {
      case ClipperLib2.Clipper.NodeType.ntOpen:
        return;
      case ClipperLib2.Clipper.NodeType.ntClosed:
        match = !polynode.IsOpen;
        break;
      default:
        break;
    }
    if (polynode.m_polygon.length > 0 && match)
      paths.push(polynode.m_polygon);
    for (var $i3 = 0, $t3 = polynode.Childs(), $l3 = $t3.length, pn = $t3[$i3]; $i3 < $l3; $i3++, pn = $t3[$i3])
      ClipperLib2.Clipper.AddPolyNodeToPaths(pn, nt, paths);
  };
  ClipperLib2.Clipper.OpenPathsFromPolyTree = function(polytree) {
    var result = new ClipperLib2.Paths();
    for (var i = 0, ilen = polytree.ChildCount(); i < ilen; i++)
      if (polytree.Childs()[i].IsOpen)
        result.push(polytree.Childs()[i].m_polygon);
    return result;
  };
  ClipperLib2.Clipper.ClosedPathsFromPolyTree = function(polytree) {
    var result = new ClipperLib2.Paths();
    ClipperLib2.Clipper.AddPolyNodeToPaths(polytree, ClipperLib2.Clipper.NodeType.ntClosed, result);
    return result;
  };
  Inherit(ClipperLib2.Clipper, ClipperLib2.ClipperBase);
  ClipperLib2.Clipper.NodeType = {
    ntAny: 0,
    ntOpen: 1,
    ntClosed: 2
  };
  ClipperLib2.ClipperOffset = function(miterLimit, arcTolerance) {
    if (typeof miterLimit === "undefined") miterLimit = 2;
    if (typeof arcTolerance === "undefined") arcTolerance = ClipperLib2.ClipperOffset.def_arc_tolerance;
    this.m_destPolys = new ClipperLib2.Paths();
    this.m_srcPoly = new ClipperLib2.Path();
    this.m_destPoly = new ClipperLib2.Path();
    this.m_normals = new Array();
    this.m_delta = 0;
    this.m_sinA = 0;
    this.m_sin = 0;
    this.m_cos = 0;
    this.m_miterLim = 0;
    this.m_StepsPerRad = 0;
    this.m_lowest = new ClipperLib2.IntPoint0();
    this.m_polyNodes = new ClipperLib2.PolyNode();
    this.MiterLimit = miterLimit;
    this.ArcTolerance = arcTolerance;
    this.m_lowest.X = -1;
  };
  ClipperLib2.ClipperOffset.two_pi = 6.28318530717959;
  ClipperLib2.ClipperOffset.def_arc_tolerance = 0.25;
  ClipperLib2.ClipperOffset.prototype.Clear = function() {
    ClipperLib2.Clear(this.m_polyNodes.Childs());
    this.m_lowest.X = -1;
  };
  ClipperLib2.ClipperOffset.Round = ClipperLib2.Clipper.Round;
  ClipperLib2.ClipperOffset.prototype.AddPath = function(path, joinType, endType) {
    var highI = path.length - 1;
    if (highI < 0)
      return;
    var newNode = new ClipperLib2.PolyNode();
    newNode.m_jointype = joinType;
    newNode.m_endtype = endType;
    if (endType === ClipperLib2.EndType.etClosedLine || endType === ClipperLib2.EndType.etClosedPolygon)
      while (highI > 0 && ClipperLib2.IntPoint.op_Equality(path[0], path[highI]))
        highI--;
    newNode.m_polygon.push(path[0]);
    var j = 0, k = 0;
    for (var i = 1; i <= highI; i++)
      if (ClipperLib2.IntPoint.op_Inequality(newNode.m_polygon[j], path[i])) {
        j++;
        newNode.m_polygon.push(path[i]);
        if (path[i].Y > newNode.m_polygon[k].Y || path[i].Y === newNode.m_polygon[k].Y && path[i].X < newNode.m_polygon[k].X)
          k = j;
      }
    if (endType === ClipperLib2.EndType.etClosedPolygon && j < 2) return;
    this.m_polyNodes.AddChild(newNode);
    if (endType !== ClipperLib2.EndType.etClosedPolygon)
      return;
    if (this.m_lowest.X < 0)
      this.m_lowest = new ClipperLib2.IntPoint2(this.m_polyNodes.ChildCount() - 1, k);
    else {
      var ip = this.m_polyNodes.Childs()[this.m_lowest.X].m_polygon[this.m_lowest.Y];
      if (newNode.m_polygon[k].Y > ip.Y || newNode.m_polygon[k].Y === ip.Y && newNode.m_polygon[k].X < ip.X)
        this.m_lowest = new ClipperLib2.IntPoint2(this.m_polyNodes.ChildCount() - 1, k);
    }
  };
  ClipperLib2.ClipperOffset.prototype.AddPaths = function(paths, joinType, endType) {
    for (var i = 0, ilen = paths.length; i < ilen; i++)
      this.AddPath(paths[i], joinType, endType);
  };
  ClipperLib2.ClipperOffset.prototype.FixOrientations = function() {
    if (this.m_lowest.X >= 0 && !ClipperLib2.Clipper.Orientation(this.m_polyNodes.Childs()[this.m_lowest.X].m_polygon)) {
      for (var i = 0; i < this.m_polyNodes.ChildCount(); i++) {
        var node = this.m_polyNodes.Childs()[i];
        if (node.m_endtype === ClipperLib2.EndType.etClosedPolygon || node.m_endtype === ClipperLib2.EndType.etClosedLine && ClipperLib2.Clipper.Orientation(node.m_polygon))
          node.m_polygon.reverse();
      }
    } else {
      for (var i = 0; i < this.m_polyNodes.ChildCount(); i++) {
        var node = this.m_polyNodes.Childs()[i];
        if (node.m_endtype === ClipperLib2.EndType.etClosedLine && !ClipperLib2.Clipper.Orientation(node.m_polygon))
          node.m_polygon.reverse();
      }
    }
  };
  ClipperLib2.ClipperOffset.GetUnitNormal = function(pt1, pt2) {
    var dx = pt2.X - pt1.X;
    var dy = pt2.Y - pt1.Y;
    if (dx === 0 && dy === 0)
      return new ClipperLib2.DoublePoint2(0, 0);
    var f = 1 / Math.sqrt(dx * dx + dy * dy);
    dx *= f;
    dy *= f;
    return new ClipperLib2.DoublePoint2(dy, -dx);
  };
  ClipperLib2.ClipperOffset.prototype.DoOffset = function(delta) {
    this.m_destPolys = new Array();
    this.m_delta = delta;
    if (ClipperLib2.ClipperBase.near_zero(delta)) {
      for (var i = 0; i < this.m_polyNodes.ChildCount(); i++) {
        var node = this.m_polyNodes.Childs()[i];
        if (node.m_endtype === ClipperLib2.EndType.etClosedPolygon)
          this.m_destPolys.push(node.m_polygon);
      }
      return;
    }
    if (this.MiterLimit > 2)
      this.m_miterLim = 2 / (this.MiterLimit * this.MiterLimit);
    else
      this.m_miterLim = 0.5;
    var y;
    if (this.ArcTolerance <= 0)
      y = ClipperLib2.ClipperOffset.def_arc_tolerance;
    else if (this.ArcTolerance > Math.abs(delta) * ClipperLib2.ClipperOffset.def_arc_tolerance)
      y = Math.abs(delta) * ClipperLib2.ClipperOffset.def_arc_tolerance;
    else
      y = this.ArcTolerance;
    var steps = 3.14159265358979 / Math.acos(1 - y / Math.abs(delta));
    this.m_sin = Math.sin(ClipperLib2.ClipperOffset.two_pi / steps);
    this.m_cos = Math.cos(ClipperLib2.ClipperOffset.two_pi / steps);
    this.m_StepsPerRad = steps / ClipperLib2.ClipperOffset.two_pi;
    if (delta < 0)
      this.m_sin = -this.m_sin;
    for (var i = 0; i < this.m_polyNodes.ChildCount(); i++) {
      var node = this.m_polyNodes.Childs()[i];
      this.m_srcPoly = node.m_polygon;
      var len = this.m_srcPoly.length;
      if (len === 0 || delta <= 0 && (len < 3 || node.m_endtype !== ClipperLib2.EndType.etClosedPolygon))
        continue;
      this.m_destPoly = new Array();
      if (len === 1) {
        if (node.m_jointype === ClipperLib2.JoinType.jtRound) {
          var X = 1, Y = 0;
          for (var j = 1; j <= steps; j++) {
            this.m_destPoly.push(new ClipperLib2.IntPoint2(ClipperLib2.ClipperOffset.Round(this.m_srcPoly[0].X + X * delta), ClipperLib2.ClipperOffset.Round(this.m_srcPoly[0].Y + Y * delta)));
            var X2 = X;
            X = X * this.m_cos - this.m_sin * Y;
            Y = X2 * this.m_sin + Y * this.m_cos;
          }
        } else {
          var X = -1, Y = -1;
          for (var j = 0; j < 4; ++j) {
            this.m_destPoly.push(new ClipperLib2.IntPoint2(ClipperLib2.ClipperOffset.Round(this.m_srcPoly[0].X + X * delta), ClipperLib2.ClipperOffset.Round(this.m_srcPoly[0].Y + Y * delta)));
            if (X < 0)
              X = 1;
            else if (Y < 0)
              Y = 1;
            else
              X = -1;
          }
        }
        this.m_destPolys.push(this.m_destPoly);
        continue;
      }
      this.m_normals.length = 0;
      for (var j = 0; j < len - 1; j++)
        this.m_normals.push(ClipperLib2.ClipperOffset.GetUnitNormal(this.m_srcPoly[j], this.m_srcPoly[j + 1]));
      if (node.m_endtype === ClipperLib2.EndType.etClosedLine || node.m_endtype === ClipperLib2.EndType.etClosedPolygon)
        this.m_normals.push(ClipperLib2.ClipperOffset.GetUnitNormal(this.m_srcPoly[len - 1], this.m_srcPoly[0]));
      else
        this.m_normals.push(new ClipperLib2.DoublePoint1(this.m_normals[len - 2]));
      if (node.m_endtype === ClipperLib2.EndType.etClosedPolygon) {
        var k = len - 1;
        for (var j = 0; j < len; j++)
          k = this.OffsetPoint(j, k, node.m_jointype);
        this.m_destPolys.push(this.m_destPoly);
      } else if (node.m_endtype === ClipperLib2.EndType.etClosedLine) {
        var k = len - 1;
        for (var j = 0; j < len; j++)
          k = this.OffsetPoint(j, k, node.m_jointype);
        this.m_destPolys.push(this.m_destPoly);
        this.m_destPoly = new Array();
        var n = this.m_normals[len - 1];
        for (var j = len - 1; j > 0; j--)
          this.m_normals[j] = new ClipperLib2.DoublePoint2(-this.m_normals[j - 1].X, -this.m_normals[j - 1].Y);
        this.m_normals[0] = new ClipperLib2.DoublePoint2(-n.X, -n.Y);
        k = 0;
        for (var j = len - 1; j >= 0; j--)
          k = this.OffsetPoint(j, k, node.m_jointype);
        this.m_destPolys.push(this.m_destPoly);
      } else {
        var k = 0;
        for (var j = 1; j < len - 1; ++j)
          k = this.OffsetPoint(j, k, node.m_jointype);
        var pt1;
        if (node.m_endtype === ClipperLib2.EndType.etOpenButt) {
          var j = len - 1;
          pt1 = new ClipperLib2.IntPoint2(ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_normals[j].X * delta), ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_normals[j].Y * delta));
          this.m_destPoly.push(pt1);
          pt1 = new ClipperLib2.IntPoint2(ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].X - this.m_normals[j].X * delta), ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].Y - this.m_normals[j].Y * delta));
          this.m_destPoly.push(pt1);
        } else {
          var j = len - 1;
          k = len - 2;
          this.m_sinA = 0;
          this.m_normals[j] = new ClipperLib2.DoublePoint2(-this.m_normals[j].X, -this.m_normals[j].Y);
          if (node.m_endtype === ClipperLib2.EndType.etOpenSquare)
            this.DoSquare(j, k);
          else
            this.DoRound(j, k);
        }
        for (var j = len - 1; j > 0; j--)
          this.m_normals[j] = new ClipperLib2.DoublePoint2(-this.m_normals[j - 1].X, -this.m_normals[j - 1].Y);
        this.m_normals[0] = new ClipperLib2.DoublePoint2(-this.m_normals[1].X, -this.m_normals[1].Y);
        k = len - 1;
        for (var j = k - 1; j > 0; --j)
          k = this.OffsetPoint(j, k, node.m_jointype);
        if (node.m_endtype === ClipperLib2.EndType.etOpenButt) {
          pt1 = new ClipperLib2.IntPoint2(ClipperLib2.ClipperOffset.Round(this.m_srcPoly[0].X - this.m_normals[0].X * delta), ClipperLib2.ClipperOffset.Round(this.m_srcPoly[0].Y - this.m_normals[0].Y * delta));
          this.m_destPoly.push(pt1);
          pt1 = new ClipperLib2.IntPoint2(ClipperLib2.ClipperOffset.Round(this.m_srcPoly[0].X + this.m_normals[0].X * delta), ClipperLib2.ClipperOffset.Round(this.m_srcPoly[0].Y + this.m_normals[0].Y * delta));
          this.m_destPoly.push(pt1);
        } else {
          k = 1;
          this.m_sinA = 0;
          if (node.m_endtype === ClipperLib2.EndType.etOpenSquare)
            this.DoSquare(0, 1);
          else
            this.DoRound(0, 1);
        }
        this.m_destPolys.push(this.m_destPoly);
      }
    }
  };
  ClipperLib2.ClipperOffset.prototype.Execute = function() {
    var a = arguments, ispolytree = a[0] instanceof ClipperLib2.PolyTree;
    if (!ispolytree) {
      var solution = a[0], delta = a[1];
      ClipperLib2.Clear(solution);
      this.FixOrientations();
      this.DoOffset(delta);
      var clpr = new ClipperLib2.Clipper(0);
      clpr.AddPaths(this.m_destPolys, ClipperLib2.PolyType.ptSubject, true);
      if (delta > 0) {
        clpr.Execute(ClipperLib2.ClipType.ctUnion, solution, ClipperLib2.PolyFillType.pftPositive, ClipperLib2.PolyFillType.pftPositive);
      } else {
        var r = ClipperLib2.Clipper.GetBounds(this.m_destPolys);
        var outer = new ClipperLib2.Path();
        outer.push(new ClipperLib2.IntPoint2(r.left - 10, r.bottom + 10));
        outer.push(new ClipperLib2.IntPoint2(r.right + 10, r.bottom + 10));
        outer.push(new ClipperLib2.IntPoint2(r.right + 10, r.top - 10));
        outer.push(new ClipperLib2.IntPoint2(r.left - 10, r.top - 10));
        clpr.AddPath(outer, ClipperLib2.PolyType.ptSubject, true);
        clpr.ReverseSolution = true;
        clpr.Execute(ClipperLib2.ClipType.ctUnion, solution, ClipperLib2.PolyFillType.pftNegative, ClipperLib2.PolyFillType.pftNegative);
        if (solution.length > 0)
          solution.splice(0, 1);
      }
    } else {
      var solution = a[0], delta = a[1];
      solution.Clear();
      this.FixOrientations();
      this.DoOffset(delta);
      var clpr = new ClipperLib2.Clipper(0);
      clpr.AddPaths(this.m_destPolys, ClipperLib2.PolyType.ptSubject, true);
      if (delta > 0) {
        clpr.Execute(ClipperLib2.ClipType.ctUnion, solution, ClipperLib2.PolyFillType.pftPositive, ClipperLib2.PolyFillType.pftPositive);
      } else {
        var r = ClipperLib2.Clipper.GetBounds(this.m_destPolys);
        var outer = new ClipperLib2.Path();
        outer.push(new ClipperLib2.IntPoint2(r.left - 10, r.bottom + 10));
        outer.push(new ClipperLib2.IntPoint2(r.right + 10, r.bottom + 10));
        outer.push(new ClipperLib2.IntPoint2(r.right + 10, r.top - 10));
        outer.push(new ClipperLib2.IntPoint2(r.left - 10, r.top - 10));
        clpr.AddPath(outer, ClipperLib2.PolyType.ptSubject, true);
        clpr.ReverseSolution = true;
        clpr.Execute(ClipperLib2.ClipType.ctUnion, solution, ClipperLib2.PolyFillType.pftNegative, ClipperLib2.PolyFillType.pftNegative);
        if (solution.ChildCount() === 1 && solution.Childs()[0].ChildCount() > 0) {
          var outerNode = solution.Childs()[0];
          solution.Childs()[0] = outerNode.Childs()[0];
          solution.Childs()[0].m_Parent = solution;
          for (var i = 1; i < outerNode.ChildCount(); i++)
            solution.AddChild(outerNode.Childs()[i]);
        } else
          solution.Clear();
      }
    }
  };
  ClipperLib2.ClipperOffset.prototype.OffsetPoint = function(j, k, jointype) {
    this.m_sinA = this.m_normals[k].X * this.m_normals[j].Y - this.m_normals[j].X * this.m_normals[k].Y;
    if (Math.abs(this.m_sinA * this.m_delta) < 1) {
      var cosA = this.m_normals[k].X * this.m_normals[j].X + this.m_normals[j].Y * this.m_normals[k].Y;
      if (cosA > 0) {
        this.m_destPoly.push(new ClipperLib2.IntPoint2(
          ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_normals[k].X * this.m_delta),
          ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_normals[k].Y * this.m_delta)
        ));
        return k;
      }
    } else if (this.m_sinA > 1)
      this.m_sinA = 1;
    else if (this.m_sinA < -1)
      this.m_sinA = -1;
    if (this.m_sinA * this.m_delta < 0) {
      this.m_destPoly.push(new ClipperLib2.IntPoint2(
        ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_normals[k].X * this.m_delta),
        ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_normals[k].Y * this.m_delta)
      ));
      this.m_destPoly.push(new ClipperLib2.IntPoint1(this.m_srcPoly[j]));
      this.m_destPoly.push(new ClipperLib2.IntPoint2(
        ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_normals[j].X * this.m_delta),
        ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_normals[j].Y * this.m_delta)
      ));
    } else
      switch (jointype) {
        case ClipperLib2.JoinType.jtMiter: {
          var r = 1 + (this.m_normals[j].X * this.m_normals[k].X + this.m_normals[j].Y * this.m_normals[k].Y);
          if (r >= this.m_miterLim)
            this.DoMiter(j, k, r);
          else
            this.DoSquare(j, k);
          break;
        }
        case ClipperLib2.JoinType.jtSquare:
          this.DoSquare(j, k);
          break;
        case ClipperLib2.JoinType.jtRound:
          this.DoRound(j, k);
          break;
      }
    k = j;
    return k;
  };
  ClipperLib2.ClipperOffset.prototype.DoSquare = function(j, k) {
    var dx = Math.tan(Math.atan2(
      this.m_sinA,
      this.m_normals[k].X * this.m_normals[j].X + this.m_normals[k].Y * this.m_normals[j].Y
    ) / 4);
    this.m_destPoly.push(new ClipperLib2.IntPoint2(
      ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_delta * (this.m_normals[k].X - this.m_normals[k].Y * dx)),
      ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_delta * (this.m_normals[k].Y + this.m_normals[k].X * dx))
    ));
    this.m_destPoly.push(new ClipperLib2.IntPoint2(
      ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_delta * (this.m_normals[j].X + this.m_normals[j].Y * dx)),
      ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_delta * (this.m_normals[j].Y - this.m_normals[j].X * dx))
    ));
  };
  ClipperLib2.ClipperOffset.prototype.DoMiter = function(j, k, r) {
    var q = this.m_delta / r;
    this.m_destPoly.push(new ClipperLib2.IntPoint2(
      ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].X + (this.m_normals[k].X + this.m_normals[j].X) * q),
      ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].Y + (this.m_normals[k].Y + this.m_normals[j].Y) * q)
    ));
  };
  ClipperLib2.ClipperOffset.prototype.DoRound = function(j, k) {
    var a = Math.atan2(
      this.m_sinA,
      this.m_normals[k].X * this.m_normals[j].X + this.m_normals[k].Y * this.m_normals[j].Y
    );
    var steps = Math.max(ClipperLib2.Cast_Int32(ClipperLib2.ClipperOffset.Round(this.m_StepsPerRad * Math.abs(a))), 1);
    var X = this.m_normals[k].X, Y = this.m_normals[k].Y, X2;
    for (var i = 0; i < steps; ++i) {
      this.m_destPoly.push(new ClipperLib2.IntPoint2(
        ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].X + X * this.m_delta),
        ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].Y + Y * this.m_delta)
      ));
      X2 = X;
      X = X * this.m_cos - this.m_sin * Y;
      Y = X2 * this.m_sin + Y * this.m_cos;
    }
    this.m_destPoly.push(new ClipperLib2.IntPoint2(
      ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].X + this.m_normals[j].X * this.m_delta),
      ClipperLib2.ClipperOffset.Round(this.m_srcPoly[j].Y + this.m_normals[j].Y * this.m_delta)
    ));
  };
  ClipperLib2.Error = function(message) {
    try {
      throw new Error(message);
    } catch (err) {
      alert(err.message);
    }
  };
  ClipperLib2.JS = {};
  ClipperLib2.JS.AreaOfPolygon = function(poly, scale) {
    if (!scale) scale = 1;
    return ClipperLib2.Clipper.Area(poly) / (scale * scale);
  };
  ClipperLib2.JS.AreaOfPolygons = function(poly, scale) {
    if (!scale) scale = 1;
    var area = 0;
    for (var i = 0; i < poly.length; i++) {
      area += ClipperLib2.Clipper.Area(poly[i]);
    }
    return area / (scale * scale);
  };
  ClipperLib2.JS.BoundsOfPath = function(path, scale) {
    return ClipperLib2.JS.BoundsOfPaths([path], scale);
  };
  ClipperLib2.JS.BoundsOfPaths = function(paths, scale) {
    if (!scale) scale = 1;
    var bounds = ClipperLib2.Clipper.GetBounds(paths);
    bounds.left /= scale;
    bounds.bottom /= scale;
    bounds.right /= scale;
    bounds.top /= scale;
    return bounds;
  };
  ClipperLib2.JS.Clean = function(polygon, delta) {
    if (!(polygon instanceof Array)) return [];
    var isPolygons = polygon[0] instanceof Array;
    var polygon = ClipperLib2.JS.Clone(polygon);
    if (typeof delta !== "number" || delta === null) {
      ClipperLib2.Error("Delta is not a number in Clean().");
      return polygon;
    }
    if (polygon.length === 0 || polygon.length === 1 && polygon[0].length === 0 || delta < 0) return polygon;
    if (!isPolygons) polygon = [polygon];
    var k_length = polygon.length;
    var len, poly, result, d, p, j, i;
    var results = [];
    for (var k = 0; k < k_length; k++) {
      poly = polygon[k];
      len = poly.length;
      if (len === 0) continue;
      else if (len < 3) {
        result = poly;
        results.push(result);
        continue;
      }
      result = poly;
      d = delta * delta;
      p = poly[0];
      j = 1;
      for (i = 1; i < len; i++) {
        if ((poly[i].X - p.X) * (poly[i].X - p.X) + (poly[i].Y - p.Y) * (poly[i].Y - p.Y) <= d)
          continue;
        result[j] = poly[i];
        p = poly[i];
        j++;
      }
      p = poly[j - 1];
      if ((poly[0].X - p.X) * (poly[0].X - p.X) + (poly[0].Y - p.Y) * (poly[0].Y - p.Y) <= d)
        j--;
      if (j < len)
        result.splice(j, len - j);
      if (result.length) results.push(result);
    }
    if (!isPolygons && results.length) results = results[0];
    else if (!isPolygons && results.length === 0) results = [];
    else if (isPolygons && results.length === 0) results = [
      []
    ];
    return results;
  };
  ClipperLib2.JS.Clone = function(polygon) {
    if (!(polygon instanceof Array)) return [];
    if (polygon.length === 0) return [];
    else if (polygon.length === 1 && polygon[0].length === 0) return [
      []
    ];
    var isPolygons = polygon[0] instanceof Array;
    if (!isPolygons) polygon = [polygon];
    var len = polygon.length, plen, i, j, result;
    var results = new Array(len);
    for (i = 0; i < len; i++) {
      plen = polygon[i].length;
      result = new Array(plen);
      for (j = 0; j < plen; j++) {
        result[j] = {
          X: polygon[i][j].X,
          Y: polygon[i][j].Y
        };
      }
      results[i] = result;
    }
    if (!isPolygons) results = results[0];
    return results;
  };
  ClipperLib2.JS.Lighten = function(polygon, tolerance) {
    if (!(polygon instanceof Array)) return [];
    if (typeof tolerance !== "number" || tolerance === null) {
      ClipperLib2.Error("Tolerance is not a number in Lighten().");
      return ClipperLib2.JS.Clone(polygon);
    }
    if (polygon.length === 0 || polygon.length === 1 && polygon[0].length === 0 || tolerance < 0) {
      return ClipperLib2.JS.Clone(polygon);
    }
    var isPolygons = polygon[0] instanceof Array;
    if (!isPolygons) polygon = [polygon];
    var i, j, poly, k, poly2, plen, A, B, P, d, rem, addlast;
    var bxax, byay, l, ax, ay;
    var len = polygon.length;
    var toleranceSq = tolerance * tolerance;
    var results = [];
    for (i = 0; i < len; i++) {
      poly = polygon[i];
      plen = poly.length;
      if (plen === 0) continue;
      for (k = 0; k < 1e6; k++) {
        poly2 = [];
        plen = poly.length;
        if (poly[plen - 1].X !== poly[0].X || poly[plen - 1].Y !== poly[0].Y) {
          addlast = 1;
          poly.push(
            {
              X: poly[0].X,
              Y: poly[0].Y
            }
          );
          plen = poly.length;
        } else addlast = 0;
        rem = [];
        for (j = 0; j < plen - 2; j++) {
          A = poly[j];
          P = poly[j + 1];
          B = poly[j + 2];
          ax = A.X;
          ay = A.Y;
          bxax = B.X - ax;
          byay = B.Y - ay;
          if (bxax !== 0 || byay !== 0) {
            l = ((P.X - ax) * bxax + (P.Y - ay) * byay) / (bxax * bxax + byay * byay);
            if (l > 1) {
              ax = B.X;
              ay = B.Y;
            } else if (l > 0) {
              ax += bxax * l;
              ay += byay * l;
            }
          }
          bxax = P.X - ax;
          byay = P.Y - ay;
          d = bxax * bxax + byay * byay;
          if (d <= toleranceSq) {
            rem[j + 1] = 1;
            j++;
          }
        }
        poly2.push(
          {
            X: poly[0].X,
            Y: poly[0].Y
          }
        );
        for (j = 1; j < plen - 1; j++)
          if (!rem[j]) poly2.push(
            {
              X: poly[j].X,
              Y: poly[j].Y
            }
          );
        poly2.push(
          {
            X: poly[plen - 1].X,
            Y: poly[plen - 1].Y
          }
        );
        if (addlast) poly.pop();
        if (!rem.length) break;
        else poly = poly2;
      }
      plen = poly2.length;
      if (poly2[plen - 1].X === poly2[0].X && poly2[plen - 1].Y === poly2[0].Y) {
        poly2.pop();
      }
      if (poly2.length > 2)
        results.push(poly2);
    }
    if (!isPolygons) {
      results = results[0];
    }
    if (typeof results === "undefined") {
      results = [];
    }
    return results;
  };
  ClipperLib2.JS.PerimeterOfPath = function(path, closed, scale) {
    if (typeof path === "undefined") return 0;
    var sqrt = Math.sqrt;
    var perimeter = 0;
    var p1, p2, p1x = 0, p1y = 0, p2x = 0, p2y = 0;
    var j = path.length;
    if (j < 2) return 0;
    if (closed) {
      path[j] = path[0];
      j++;
    }
    while (--j) {
      p1 = path[j];
      p1x = p1.X;
      p1y = p1.Y;
      p2 = path[j - 1];
      p2x = p2.X;
      p2y = p2.Y;
      perimeter += sqrt((p1x - p2x) * (p1x - p2x) + (p1y - p2y) * (p1y - p2y));
    }
    if (closed) path.pop();
    return perimeter / scale;
  };
  ClipperLib2.JS.PerimeterOfPaths = function(paths, closed, scale) {
    if (!scale) scale = 1;
    var perimeter = 0;
    for (var i = 0; i < paths.length; i++) {
      perimeter += ClipperLib2.JS.PerimeterOfPath(paths[i], closed, scale);
    }
    return perimeter;
  };
  ClipperLib2.JS.ScaleDownPath = function(path, scale) {
    var i, p;
    if (!scale) scale = 1;
    i = path.length;
    while (i--) {
      p = path[i];
      p.X = p.X / scale;
      p.Y = p.Y / scale;
    }
  };
  ClipperLib2.JS.ScaleDownPaths = function(paths, scale) {
    var i, j, p;
    if (!scale) scale = 1;
    i = paths.length;
    while (i--) {
      j = paths[i].length;
      while (j--) {
        p = paths[i][j];
        p.X = p.X / scale;
        p.Y = p.Y / scale;
      }
    }
  };
  ClipperLib2.JS.ScaleUpPath = function(path, scale) {
    var i, p, round = Math.round;
    if (!scale) scale = 1;
    i = path.length;
    while (i--) {
      p = path[i];
      p.X = round(p.X * scale);
      p.Y = round(p.Y * scale);
    }
  };
  ClipperLib2.JS.ScaleUpPaths = function(paths, scale) {
    var i, j, p, round = Math.round;
    if (!scale) scale = 1;
    i = paths.length;
    while (i--) {
      j = paths[i].length;
      while (j--) {
        p = paths[i][j];
        p.X = round(p.X * scale);
        p.Y = round(p.Y * scale);
      }
    }
  };
  ClipperLib2.ExPolygons = function() {
    return [];
  };
  ClipperLib2.ExPolygon = function() {
    this.outer = null;
    this.holes = null;
  };
  ClipperLib2.JS.AddOuterPolyNodeToExPolygons = function(polynode, expolygons) {
    var ep = new ClipperLib2.ExPolygon();
    ep.outer = polynode.Contour();
    var childs = polynode.Childs();
    var ilen = childs.length;
    ep.holes = new Array(ilen);
    var node, n, i, j, childs2, jlen;
    for (i = 0; i < ilen; i++) {
      node = childs[i];
      ep.holes[i] = node.Contour();
      for (j = 0, childs2 = node.Childs(), jlen = childs2.length; j < jlen; j++) {
        n = childs2[j];
        ClipperLib2.JS.AddOuterPolyNodeToExPolygons(n, expolygons);
      }
    }
    expolygons.push(ep);
  };
  ClipperLib2.JS.ExPolygonsToPaths = function(expolygons) {
    var a, i, alen, ilen;
    var paths = new ClipperLib2.Paths();
    for (a = 0, alen = expolygons.length; a < alen; a++) {
      paths.push(expolygons[a].outer);
      for (i = 0, ilen = expolygons[a].holes.length; i < ilen; i++) {
        paths.push(expolygons[a].holes[i]);
      }
    }
    return paths;
  };
  ClipperLib2.JS.PolyTreeToExPolygons = function(polytree) {
    var expolygons = new ClipperLib2.ExPolygons();
    var node, i, childs, ilen;
    for (i = 0, childs = polytree.Childs(), ilen = childs.length; i < ilen; i++) {
      node = childs[i];
      ClipperLib2.JS.AddOuterPolyNodeToExPolygons(node, expolygons);
    }
    return expolygons;
  };
})();

// src/ext/clip2.esm.js
var ClipperLib = self.ClipperLib;

// src/void/solid/chamfer.js
function vec3(x = 0, y = 0, z = 0) {
  return { x: Number(x) || 0, y: Number(y) || 0, z: Number(z) || 0 };
}
function add(a, b) {
  return vec3(a.x + b.x, a.y + b.y, a.z + b.z);
}
function sub(a, b) {
  return vec3(a.x - b.x, a.y - b.y, a.z - b.z);
}
function mul(a, s) {
  return vec3(a.x * s, a.y * s, a.z * s);
}
function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function cross(a, b) {
  return vec3(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x
  );
}
function length(a) {
  return Math.hypot(a.x, a.y, a.z);
}
function normalize(a) {
  const len = length(a) || 1;
  return vec3(a.x / len, a.y / len, a.z / len);
}
function distanceSq(a, b) {
  const d = sub(a, b);
  return dot(d, d);
}
function centroidFromPositions(pos) {
  const count = Math.floor((pos?.length || 0) / 3);
  if (!count) return vec3(0, 0, 0);
  let sx = 0, sy = 0, sz = 0;
  for (let i = 0; i < pos.length; i += 3) {
    sx += Number(pos[i] || 0);
    sy += Number(pos[i + 1] || 0);
    sz += Number(pos[i + 2] || 0);
  }
  return vec3(sx / count, sy / count, sz / count);
}
function pointFromPositions(pos, vi) {
  const i = vi * 3;
  return vec3(pos[i], pos[i + 1], pos[i + 2]);
}
function normalForTriangle(pos, i0, i1, i2) {
  const a = pointFromPositions(pos, i0);
  const b = pointFromPositions(pos, i1);
  const c = pointFromPositions(pos, i2);
  const ab = sub(b, a);
  const ac = sub(c, a);
  const n = cross(ab, ac);
  const len = length(n);
  return len > 1e-12 ? mul(n, 1 / len) : vec3(0, 0, 1);
}
function edgeKey(a, b) {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}
function buildMeshAdjacency(mesh) {
  const pos = mesh?.positions;
  const idx = mesh?.indices;
  if (!pos?.length || !idx?.length) return null;
  const edgeToTris = /* @__PURE__ */ new Map();
  const edgeVerts = /* @__PURE__ */ new Map();
  const triCount = Math.floor(idx.length / 3);
  for (let t = 0; t < triCount; t++) {
    const i0 = idx[t * 3];
    const i1 = idx[t * 3 + 1];
    const i2 = idx[t * 3 + 2];
    const edges = [[i0, i1], [i1, i2], [i2, i0]];
    for (const [va, vb] of edges) {
      const k = edgeKey(va, vb);
      const list = edgeToTris.get(k);
      if (list) list.push(t);
      else edgeToTris.set(k, [t]);
      if (!edgeVerts.has(k)) edgeVerts.set(k, [va, vb]);
    }
  }
  return { positions: pos, indices: idx, edgeToTris, edgeVerts, centroid: centroidFromPositions(pos) };
}
function edgeEndpointScore(a, b, ea, eb) {
  const d1 = Math.sqrt(distanceSq(a, ea)) + Math.sqrt(distanceSq(b, eb));
  const d2 = Math.sqrt(distanceSq(a, eb)) + Math.sqrt(distanceSq(b, ea));
  return Math.min(d1, d2);
}
function makeTriPrismMesh(a0, a1, a2, b0, b1, b2) {
  const positions = new Float32Array([
    a0.x,
    a0.y,
    a0.z,
    a1.x,
    a1.y,
    a1.z,
    a2.x,
    a2.y,
    a2.z,
    b0.x,
    b0.y,
    b0.z,
    b1.x,
    b1.y,
    b1.z,
    b2.x,
    b2.y,
    b2.z
  ]);
  const indices = new Uint32Array([
    0,
    2,
    1,
    3,
    4,
    5,
    0,
    1,
    4,
    0,
    4,
    3,
    1,
    2,
    5,
    1,
    5,
    4,
    2,
    0,
    3,
    2,
    3,
    5
  ]);
  return { positions, indices };
}
function getEdgeRecordByKey(meshInfo, key) {
  const parts = String(key || "").split(":");
  if (parts.length !== 2) return null;
  const va = Number(parts[0]);
  const vb = Number(parts[1]);
  if (!Number.isFinite(va) || !Number.isFinite(vb)) return null;
  const ek = edgeKey(va, vb);
  const rep = meshInfo?.edgeVerts?.get?.(ek) || null;
  const tris = meshInfo?.edgeToTris?.get?.(ek) || null;
  if (!rep || !Array.isArray(tris) || tris.length < 2) return null;
  return {
    va: Number(rep[0]),
    vb: Number(rep[1]),
    tris
  };
}
function chooseTrianglePair(meshInfo, tris, va, vb, strictCrease = false) {
  const positions = meshInfo.positions;
  const indices = meshInfo.indices;
  const creaseDotMax = Math.cos(30 * Math.PI / 180);
  let pair = null;
  let pairDot = 1;
  for (let i = 0; i < tris.length; i++) {
    for (let j = i + 1; j < tris.length; j++) {
      const t0 = tris[i];
      const t1 = tris[j];
      const t0i0 = indices[t0 * 3];
      const t0i1 = indices[t0 * 3 + 1];
      const t0i2 = indices[t0 * 3 + 2];
      const t1i0 = indices[t1 * 3];
      const t1i1 = indices[t1 * 3 + 1];
      const t1i2 = indices[t1 * 3 + 2];
      const n1 = normalForTriangle(positions, t0i0, t0i1, t0i2);
      const n2 = normalForTriangle(positions, t1i0, t1i1, t1i2);
      const d = Math.max(-1, Math.min(1, dot(n1, n2)));
      if (strictCrease && d > creaseDotMax) continue;
      if (d < pairDot) {
        pairDot = d;
        pair = { t0, t1 };
      }
    }
  }
  return pair;
}
function buildCutterFromResolvedEdge(meshInfo, va, vb, tris, distance) {
  const positions = meshInfo.positions;
  const indices = meshInfo.indices;
  const triPair = chooseTrianglePair(meshInfo, tris, va, vb, false);
  if (!triPair) return null;
  const t0 = triPair.t0;
  const t1 = triPair.t1;
  const t0i0 = indices[t0 * 3];
  const t0i1 = indices[t0 * 3 + 1];
  const t0i2 = indices[t0 * 3 + 2];
  const t1i0 = indices[t1 * 3];
  const t1i1 = indices[t1 * 3 + 1];
  const t1i2 = indices[t1 * 3 + 2];
  const n1 = normalForTriangle(positions, t0i0, t0i1, t0i2);
  const n2 = normalForTriangle(positions, t1i0, t1i1, t1i2);
  const a = pointFromPositions(positions, va);
  const b = pointFromPositions(positions, vb);
  const edge = sub(b, a);
  const edgeLen = length(edge);
  if (edgeLen <= 1e-8) return null;
  const e = mul(edge, 1 / edgeLen);
  let u1 = sub(n1, mul(e, dot(n1, e)));
  let u2 = sub(n2, mul(e, dot(n2, e)));
  if (length(u1) <= 1e-8 || length(u2) <= 1e-8) return null;
  u1 = normalize(u1);
  u2 = normalize(u2);
  const normalDelta = Math.max(-1, Math.min(1, dot(u1, u2)));
  if (normalDelta > 0.997) return null;
  let i1 = mul(u1, -1);
  let i2 = mul(u2, -1);
  const mid = mul(add(a, b), 0.5);
  const toCenter = sub(meshInfo.centroid, mid);
  if (dot(i1, toCenter) < 0 && dot(i2, toCenter) < 0) {
    i1 = mul(i1, -1);
    i2 = mul(i2, -1);
  }
  const ext = distance * 1.4;
  const spineA = add(a, mul(e, -ext));
  const spineB = add(b, mul(e, ext));
  let out = mul(add(i1, i2), -1);
  if (length(out) <= 1e-8) {
    out = mul(i1, -1);
  } else {
    out = normalize(out);
  }
  const insideScale = distance * 1.8;
  const outsideScale = distance * 0.7;
  const a0 = add(spineA, mul(out, outsideScale));
  const a1 = add(spineA, mul(i1, insideScale));
  const a2 = add(spineA, mul(i2, insideScale));
  const b0 = add(spineB, mul(out, outsideScale));
  const b1 = add(spineB, mul(i1, insideScale));
  const b2 = add(spineB, mul(i2, insideScale));
  const area = length(cross(sub(a1, a0), sub(a2, a0)));
  if (area <= 1e-8) return null;
  return {
    key: edgeKey(va, vb),
    mesh: makeTriPrismMesh(a0, a1, a2, b0, b1, b2)
  };
}
function buildCutterForMeshEdgeKey(meshInfo, meshEdgeKey, distance) {
  const rec = getEdgeRecordByKey(meshInfo, meshEdgeKey);
  if (!rec) return null;
  return buildCutterFromResolvedEdge(meshInfo, rec.va, rec.vb, rec.tris, distance);
}
function buildCutterForSegment(meshInfo, aPoint, bPoint, distance) {
  if (!meshInfo || !aPoint || !bPoint || !(distance > 0)) return null;
  const positions = meshInfo.positions;
  let best = null;
  let bestScore = Infinity;
  const creaseDotMax = Math.cos(30 * Math.PI / 180);
  const requestedLen = Math.sqrt(distanceSq(aPoint, bPoint));
  if (!(requestedLen > 1e-9)) return null;
  const reqDir = normalize(sub(bPoint, aPoint));
  const reqMid = mul(add(aPoint, bPoint), 0.5);
  const findBest = (relaxed = false) => {
    let localBest = null;
    let localBestScore = Infinity;
    for (const [ek, tris] of meshInfo.edgeToTris.entries()) {
      if (!Array.isArray(tris) || tris.length < 2) continue;
      const parts = String(ek).split(":");
      if (parts.length !== 2) continue;
      const rep = meshInfo.edgeVerts?.get?.(ek) || null;
      const va = Number(rep?.[0]);
      const vb = Number(rep?.[1]);
      if (!Number.isFinite(va) || !Number.isFinite(vb) || va === vb) continue;
      const ea = pointFromPositions(positions, va);
      const eb = pointFromPositions(positions, vb);
      const cand = sub(eb, ea);
      const candLen = length(cand);
      if (!(candLen > 1e-9)) continue;
      const candDir = mul(cand, 1 / candLen);
      const dirAlign = Math.abs(dot(reqDir, candDir));
      const candMid = mul(add(ea, eb), 0.5);
      const midDist = Math.sqrt(distanceSq(reqMid, candMid));
      if (!relaxed) {
        if (dirAlign < 0.5) continue;
        const maxMidDist = Math.max(1.5, requestedLen * 0.8, candLen * 0.8);
        if (midDist > maxMidDist) continue;
      }
      const pair = chooseTrianglePair(meshInfo, tris, va, vb, false);
      const pairDot = (() => {
        if (!pair) return 1;
        const idx = meshInfo.indices;
        const t0i0 = idx[pair.t0 * 3];
        const t0i1 = idx[pair.t0 * 3 + 1];
        const t0i2 = idx[pair.t0 * 3 + 2];
        const t1i0 = idx[pair.t1 * 3];
        const t1i1 = idx[pair.t1 * 3 + 1];
        const t1i2 = idx[pair.t1 * 3 + 2];
        const n1 = normalForTriangle(meshInfo.positions, t0i0, t0i1, t0i2);
        const n2 = normalForTriangle(meshInfo.positions, t1i0, t1i1, t1i2);
        return Math.max(-1, Math.min(1, dot(n1, n2)));
      })();
      if (!pair) continue;
      if (!relaxed && pairDot > creaseDotMax) continue;
      const score = edgeEndpointScore(aPoint, bPoint, ea, eb) + midDist * 0.5 + (1 - dirAlign) * (relaxed ? 0.1 : 2);
      if (score < localBestScore) {
        localBestScore = score;
        localBest = { va, vb, tris: [pair.t0, pair.t1] };
      }
    }
    return { best: localBest, score: localBestScore };
  };
  const strict = findBest(false);
  if (strict.best) {
    best = strict.best;
    bestScore = strict.score;
  } else {
    const relaxed = findBest(true);
    best = relaxed.best;
    bestScore = relaxed.score;
  }
  if (!best) return null;
  return buildCutterFromResolvedEdge(meshInfo, best.va, best.vb, best.tris, distance);
}
function segmentsFromEdgeRef(edgeRef) {
  if (!edgeRef) return [];
  const path = Array.isArray(edgeRef.path) ? edgeRef.path : null;
  if (path?.length >= 2) {
    let pts = path.map((p) => vec3(p.x, p.y, p.z));
    if (pts.length > 2) {
      const first = pts[0];
      const last = pts[pts.length - 1];
      if (Math.sqrt(distanceSq(first, last)) <= 1e-7) {
        pts = pts.slice(0, -1);
      }
    }
    const maxPts = 49;
    if (pts.length > maxPts) {
      const reduced = [];
      for (let i = 0; i < maxPts; i++) {
        const t = i / (maxPts - 1);
        const idx = Math.round(t * (pts.length - 1));
        reduced.push(pts[Math.max(0, Math.min(pts.length - 1, idx))]);
      }
      pts = reduced;
    }
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a2 = pts[i];
      const b2 = pts[i + 1];
      if (!a2 || !b2) continue;
      out.push([a2, b2]);
    }
    if (pts.length > 2) {
      out.push([pts[pts.length - 1], pts[0]]);
    }
    return out;
  }
  const a = edgeRef?.a;
  const b = edgeRef?.b;
  if (a && b) return [[vec3(a.x, a.y, a.z), vec3(b.x, b.y, b.z)]];
  return [];
}
function concatMeshes(meshes = []) {
  if (!Array.isArray(meshes) || !meshes.length) return null;
  let posLen = 0;
  let idxLen = 0;
  for (const mesh of meshes) {
    if (!mesh?.positions?.length || !mesh?.indices?.length) continue;
    posLen += mesh.positions.length;
    idxLen += mesh.indices.length;
  }
  if (!posLen || !idxLen) return null;
  const positions = new Float32Array(posLen);
  const indices = new Uint32Array(idxLen);
  let po = 0;
  let io = 0;
  let vBase = 0;
  for (const mesh of meshes) {
    if (!mesh?.positions?.length || !mesh?.indices?.length) continue;
    positions.set(mesh.positions, po);
    for (let i = 0; i < mesh.indices.length; i++) {
      indices[io + i] = Number(mesh.indices[i] || 0) + vBase;
    }
    po += mesh.positions.length;
    io += mesh.indices.length;
    vBase += Math.floor(mesh.positions.length / 3);
  }
  return { positions, indices };
}
function scaleMeshAroundCentroid(mesh, scale = 1.001) {
  if (!mesh?.positions?.length || !mesh?.indices?.length) return null;
  const c = centroidFromPositions(mesh.positions);
  const out = new Float32Array(mesh.positions.length);
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const x = Number(mesh.positions[i] || 0);
    const y = Number(mesh.positions[i + 1] || 0);
    const z = Number(mesh.positions[i + 2] || 0);
    out[i] = c.x + (x - c.x) * scale;
    out[i + 1] = c.y + (y - c.y) * scale;
    out[i + 2] = c.z + (z - c.z) * scale;
  }
  return {
    positions: out,
    indices: mesh.indices instanceof Uint32Array ? mesh.indices : new Uint32Array(mesh.indices || [])
  };
}
function cloneMesh(mesh) {
  if (!mesh?.positions?.length || !mesh?.indices?.length) return null;
  return {
    positions: mesh.positions instanceof Float32Array ? new Float32Array(mesh.positions) : new Float32Array(mesh.positions || []),
    indices: mesh.indices instanceof Uint32Array ? new Uint32Array(mesh.indices) : new Uint32Array(mesh.indices || [])
  };
}
function makePassThroughSolid(feature, targetSolid, solidId, bodySeqRef, makeBodyId2, reason = "no-op") {
  const nextId = makeBodyId2(feature.id, bodySeqRef.value++);
  const sketchIds = Array.isArray(targetSolid?.source?.sketch_ids) ? targetSolid.source.sketch_ids.slice() : [];
  return {
    id: nextId,
    name: `${feature.name || "Chamfer"}-${bodySeqRef.value}`,
    visible: feature.visible !== false,
    source: {
      feature_id: feature.id,
      feature_type: feature.type,
      parent: solidId,
      pass_through: true,
      reason,
      sketch_ids: sketchIds
    },
    provenance: {
      source: {
        feature_id: feature.id,
        feature_type: feature.type,
        parent: solidId,
        pass_through: true,
        reason
      },
      parents: [solidId]
    },
    mesh: {
      tri_count: targetSolid?.mesh?.tri_count || 0,
      vert_count: targetSolid?.mesh?.vert_count || 0
    },
    status: "manifold_chamfer_passthrough"
  };
}
function parseBoundarySegmentRef(boundarySegmentId) {
  const raw = String(boundarySegmentId || "");
  if (!raw) return null;
  const parts = raw.split(":");
  if (raw.startsWith("segment:") && parts.length >= 5) {
    const segInLoop = Number(parts[parts.length - 1]);
    const loopIndex = Number(parts[parts.length - 2]);
    const faceId = Number(parts[parts.length - 3]);
    const solidId = parts.slice(1, -3).join(":");
    if (!solidId || !Number.isFinite(faceId) || !Number.isFinite(loopIndex) || !Number.isFinite(segInLoop)) return null;
    return { kind: "segment", id: raw, solidId, faceId, loopIndex, segInLoop };
  }
  if (raw.startsWith("boundary:") && parts.length >= 4) {
    const loopIndex = Number(parts[parts.length - 1]);
    const faceId = Number(parts[parts.length - 2]);
    const solidId = parts.slice(1, -2).join(":");
    if (!solidId || !Number.isFinite(faceId) || !Number.isFinite(loopIndex)) return null;
    return { kind: "boundary", id: raw, solidId, faceId, loopIndex };
  }
  return null;
}
async function applyChamferFeature(solids, meshCache, feature, makeBodyId2, bodySeqRef) {
  const refs = Array.isArray(feature?.input?.edges) ? feature.input.edges : [];
  const distance = Math.max(1e-4, Math.abs(Number(feature?.params?.distance ?? 1)));
  const showCutters = feature?.params?.showCutters === true;
  if (!refs.length || !(distance > 0)) return false;
  const bySolid = /* @__PURE__ */ new Map();
  for (const ref of refs) {
    let solidId = String(ref?.solidId || ref?.solid_id || "");
    if (!solidId) {
      const parsed = parseBoundarySegmentRef(ref?.boundary_segment_id || ref?.entity?.id || ref?.key || null);
      solidId = String(parsed?.solidId || "");
    }
    if (!solidId) continue;
    const list = bySolid.get(solidId);
    if (list) list.push(ref);
    else bySolid.set(solidId, [ref]);
  }
  if (!bySolid.size) return false;
  let changed = false;
  for (const [solidId, solidRefs] of bySolid.entries()) {
    const targetSolid = solids.find((s) => s?.id === solidId) || null;
    const targetMesh = meshCache.get(solidId);
    if (!targetSolid || !targetMesh?.positions?.length || !targetMesh?.indices?.length) continue;
    const adj = buildMeshAdjacency(targetMesh);
    if (!adj) continue;
    const tools = [];
    const usedEdgeKeys = /* @__PURE__ */ new Set();
    for (const ref of solidRefs) {
      const meshEdgeKeys = Array.isArray(ref?.meshEdgeKeys) ? ref.meshEdgeKeys.filter(Boolean) : [];
      if (meshEdgeKeys.length) {
        for (const mek of meshEdgeKeys) {
          const built = buildCutterForMeshEdgeKey(adj, mek, distance);
          const cutter = built?.mesh || null;
          const cutterKey = String(built?.key || mek || "");
          if (cutterKey && usedEdgeKeys.has(cutterKey)) continue;
          if (cutter?.positions?.length && cutter?.indices?.length) {
            if (cutterKey) usedEdgeKeys.add(cutterKey);
            tools.push(cutter);
          }
        }
        continue;
      }
      if (ref?.meshEdgeKey && !(Array.isArray(ref.path) && ref.path.length >= 2)) {
        const built = buildCutterForMeshEdgeKey(adj, ref.meshEdgeKey, distance);
        const cutter = built?.mesh || null;
        const cutterKey = String(built?.key || "");
        if (cutterKey && usedEdgeKeys.has(cutterKey)) continue;
        if (cutter?.positions?.length && cutter?.indices?.length) {
          if (cutterKey) usedEdgeKeys.add(cutterKey);
          tools.push(cutter);
          continue;
        }
      }
      const segs = segmentsFromEdgeRef(ref);
      for (const [a, b] of segs) {
        const built = buildCutterForSegment(adj, a, b, distance);
        const cutter = built?.mesh || null;
        const cutterKey = String(built?.key || "");
        if (cutterKey && usedEdgeKeys.has(cutterKey)) continue;
        if (cutter?.positions?.length && cutter?.indices?.length) {
          if (cutterKey) usedEdgeKeys.add(cutterKey);
          tools.push(cutter);
        }
      }
    }
    if (!tools.length) {
      console.warn("void.chamfer.no_cutters", { featureId: feature?.id, solidId, refs: solidRefs.length });
      const targetIndex2 = solids.findIndex((s) => s?.id === solidId);
      if (targetIndex2 >= 0) {
        const nextSolid2 = makePassThroughSolid(feature, targetSolid, solidId, bodySeqRef, makeBodyId2, "no_cutters");
        const copied = cloneMesh(targetMesh);
        if (copied?.positions?.length && copied?.indices?.length) {
          solids[targetIndex2] = nextSolid2;
          meshCache.delete(solidId);
          meshCache.set(nextSolid2.id, copied);
          changed = true;
        }
      }
      continue;
    }
    if (showCutters) {
      const merged = concatMeshes(tools);
      if (merged?.positions?.length && merged?.indices?.length) {
        const nextId2 = makeBodyId2(feature.id, bodySeqRef.value++);
        const nextSolid2 = {
          id: nextId2,
          name: `${feature.name || "Chamfer"}-cutters`,
          visible: feature.visible !== false,
          source: {
            feature_id: feature.id,
            feature_type: feature.type,
            parent: solidId,
            debug: "cutters",
            distance
          },
          provenance: {
            source: {
              feature_id: feature.id,
              feature_type: feature.type,
              parent: solidId,
              debug: "cutters"
            },
            parents: [solidId]
          },
          mesh: {
            tri_count: (merged.indices.length || 0) / 3,
            vert_count: (merged.positions.length || 0) / 3
          },
          status: "manifold_chamfer_debug_cutters"
        };
        solids.push(nextSolid2);
        meshCache.set(nextId2, merged);
        console.log("void.chamfer.debug_cutters", {
          featureId: feature?.id,
          solidId,
          cutters: tools.length,
          tri: Math.floor((merged.indices.length || 0) / 3)
        });
        changed = true;
      }
      continue;
    }
    let result = await booleanMeshes({
      mode: "subtract",
      targets: [targetMesh],
      tools
    });
    if (!result?.mesh?.positions?.length || !result?.mesh?.indices?.length) {
      let current = targetMesh;
      let applied = 0;
      for (const tool of tools) {
        const step = await booleanMeshes({
          mode: "subtract",
          targets: [current],
          tools: [tool]
        });
        if (step?.mesh?.positions?.length && step?.mesh?.indices?.length) {
          current = step.mesh;
          applied++;
          continue;
        }
        const grown = scaleMeshAroundCentroid(tool, 1.001);
        if (grown) {
          const stepGrown = await booleanMeshes({
            mode: "subtract",
            targets: [current],
            tools: [grown]
          });
          if (stepGrown?.mesh?.positions?.length && stepGrown?.mesh?.indices?.length) {
            current = stepGrown.mesh;
            applied++;
          }
        }
      }
      if (applied > 0) {
        result = { mesh: current };
        console.warn("void.chamfer.bulk_failed_sequential_used", {
          featureId: feature?.id,
          solidId,
          cutters: tools.length,
          applied
        });
      }
    }
    if (!result?.mesh?.positions?.length || !result?.mesh?.indices?.length) {
      console.warn("void.chamfer.boolean_failed", { featureId: feature?.id, solidId, cutters: tools.length });
      const targetIndex2 = solids.findIndex((s) => s?.id === solidId);
      if (targetIndex2 >= 0) {
        const nextSolid2 = makePassThroughSolid(feature, targetSolid, solidId, bodySeqRef, makeBodyId2, "boolean_failed");
        const copied = cloneMesh(targetMesh);
        if (copied?.positions?.length && copied?.indices?.length) {
          solids[targetIndex2] = nextSolid2;
          meshCache.delete(solidId);
          meshCache.set(nextSolid2.id, copied);
          changed = true;
        }
      }
      continue;
    }
    const targetIndex = solids.findIndex((s) => s?.id === solidId);
    if (targetIndex < 0) continue;
    const nextId = makeBodyId2(feature.id, bodySeqRef.value++);
    const sketchIds = Array.isArray(targetSolid?.source?.sketch_ids) ? targetSolid.source.sketch_ids.slice() : [];
    const nextSolid = {
      id: nextId,
      name: `${feature.name || "Chamfer"}-${bodySeqRef.value}`,
      visible: feature.visible !== false,
      source: {
        feature_id: feature.id,
        feature_type: feature.type,
        parent: solidId,
        edges: solidRefs.map((ref) => ({
          key: ref?.key || null,
          boundary_segment_id: ref?.boundary_segment_id || null,
          solidId: ref?.solidId || null,
          edgeIndex: ref?.edgeIndex ?? null
        })),
        distance,
        sketch_ids: sketchIds
      },
      provenance: {
        source: {
          feature_id: feature.id,
          feature_type: feature.type,
          parent: solidId,
          distance
        },
        parents: [solidId]
      },
      mesh: {
        tri_count: (result.mesh.indices.length || 0) / 3,
        vert_count: (result.mesh.positions.length || 0) / 3
      },
      status: "manifold_chamfer_ready"
    };
    solids.splice(targetIndex, 1, nextSolid);
    meshCache.delete(solidId);
    meshCache.set(nextId, result.mesh);
    if (false) console.log("void.chamfer.applied", {
      featureId: feature?.id,
      solidId,
      cutters: tools.length,
      triIn: Math.floor((targetMesh.indices?.length || 0) / 3),
      triOut: Math.floor((result.mesh.indices?.length || 0) / 3)
    });
    changed = true;
  }
  return changed;
}

// src/void/solid/rebuild.js
var CLIPPER_SCALE = 1e5;
function resolveProfileTargetRef(profileTarget = {}) {
  const regionId = String(profileTarget?.region_id || "");
  const match = regionId.match(/^profile:([^:]+):([^:]+)$/);
  if (!match) return { regionId: null, sketchId: null, profileId: null, key: null };
  const sketchId = match[1];
  const profileId = match[2];
  return { regionId, sketchId, profileId, key: regionId };
}
function normalizeProfileLoops(loops) {
  if (!Array.isArray(loops) || !loops.length) return null;
  const out = loops.filter((loop) => Array.isArray(loop) && loop.length >= 3).map((loop) => loop.map((p) => ({ x: Number(p?.x || 0), y: Number(p?.y || 0) })));
  return out.length ? out : null;
}
function profileLoopsFromTarget(profileTarget = {}) {
  return normalizeProfileLoops(profileTarget?.loops);
}
function profileLoopsFromSnapshot(snapshot, profileTarget) {
  const direct = profileLoopsFromTarget(profileTarget);
  if (direct?.length) return direct;
  const { sketchId, profileId, key } = resolveProfileTargetRef(profileTarget);
  if (!key || !sketchId || !profileId) return null;
  const map = snapshot?.profileLoops || {};
  return normalizeProfileLoops(map[key]);
}
function makeBodyId(featureId, index) {
  return `${featureId}:body:${index}`;
}
function getSketchIdsForSolid(solid) {
  const ids = /* @__PURE__ */ new Set();
  const add2 = (value) => {
    if (value) ids.add(value);
  };
  add2(solid?.source?.profile?.sketchId);
  for (const sid of solid?.source?.sketch_ids || []) {
    add2(sid);
  }
  add2(solid?.provenance?.source?.profile?.sketchId);
  for (const face of solid?.provenance?.faces || []) {
    add2(face?.source?.sketchId);
  }
  return ids;
}
function basisFromPlaneFrame(frame) {
  const origin = {
    x: Number(frame?.origin?.x ?? 0),
    y: Number(frame?.origin?.y ?? 0),
    z: Number(frame?.origin?.z ?? 0)
  };
  const normalRaw = {
    x: Number(frame?.normal?.x ?? 0),
    y: Number(frame?.normal?.y ?? 0),
    z: Number(frame?.normal?.z ?? 1)
  };
  const nxLen = Math.hypot(normalRaw.x, normalRaw.y, normalRaw.z) || 1;
  const normal = {
    x: normalRaw.x / nxLen,
    y: normalRaw.y / nxLen,
    z: normalRaw.z / nxLen
  };
  const xAxisRaw = {
    x: Number(frame?.x_axis?.x ?? 1),
    y: Number(frame?.x_axis?.y ?? 0),
    z: Number(frame?.x_axis?.z ?? 0)
  };
  const xDotN = xAxisRaw.x * normal.x + xAxisRaw.y * normal.y + xAxisRaw.z * normal.z;
  let xAxis = {
    x: xAxisRaw.x - normal.x * xDotN,
    y: xAxisRaw.y - normal.y * xDotN,
    z: xAxisRaw.z - normal.z * xDotN
  };
  const xLen = Math.hypot(xAxis.x, xAxis.y, xAxis.z) || 1;
  xAxis = { x: xAxis.x / xLen, y: xAxis.y / xLen, z: xAxis.z / xLen };
  const yAxis = {
    x: normal.y * xAxis.z - normal.z * xAxis.y,
    y: normal.z * xAxis.x - normal.x * xAxis.z,
    z: normal.x * xAxis.y - normal.y * xAxis.x
  };
  return { origin, xAxis, yAxis, normal };
}
function transformMeshToWorld(mesh, basis, zShift = 0) {
  const numProp = Math.max(3, Number(mesh?.numProp || 3));
  const verts = mesh?.vertProperties;
  const triVerts = mesh?.triVerts;
  if (!verts?.length || !triVerts?.length) return null;
  const vertCount = Math.floor(verts.length / numProp);
  const positions = new Float32Array(vertCount * 3);
  const { origin, xAxis, yAxis, normal } = basis;
  for (let i = 0; i < vertCount; i++) {
    const o = i * numProp;
    const lx = Number(verts[o] || 0);
    const ly = Number(verts[o + 1] || 0);
    const lz = Number(verts[o + 2] || 0) + (Number(zShift) || 0);
    const wx = origin.x + xAxis.x * lx + yAxis.x * ly + normal.x * lz;
    const wy = origin.y + xAxis.y * lx + yAxis.y * ly + normal.y * lz;
    const wz = origin.z + xAxis.z * lx + yAxis.z * ly + normal.z * lz;
    const p = i * 3;
    positions[p] = wx;
    positions[p + 1] = wy;
    positions[p + 2] = wz;
  }
  return {
    positions,
    indices: Uint32Array.from(triVerts)
  };
}
function polygonSignedArea(loop) {
  if (!Array.isArray(loop) || loop.length < 3) return 0;
  let area2 = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i];
    const b = loop[(i + 1) % loop.length];
    area2 += (a.x || 0) * (b.y || 0) - (b.x || 0) * (a.y || 0);
  }
  return area2 * 0.5;
}
function ensureLoopWinding(loop, ccw = true) {
  if (!Array.isArray(loop) || loop.length < 3) return loop;
  const isCCW = polygonSignedArea(loop) > 0;
  if (ccw && isCCW || !ccw && !isCCW) return loop;
  return loop.slice().reverse();
}
function toClipperPath(loop) {
  if (!Array.isArray(loop) || loop.length < 3) return null;
  const path = [];
  for (const p of loop) {
    path.push({
      X: Math.round((p?.x || 0) * CLIPPER_SCALE),
      Y: Math.round((p?.y || 0) * CLIPPER_SCALE)
    });
  }
  return path.length >= 3 ? path : null;
}
function fromClipperPath(path) {
  if (!Array.isArray(path) || path.length < 3) return null;
  return path.map((pt) => ({
    x: Number(pt?.X || 0) / CLIPPER_SCALE,
    y: Number(pt?.Y || 0) / CLIPPER_SCALE
  }));
}
function unionSelectedRegions(profileLoopsList) {
  if (!Array.isArray(profileLoopsList) || !profileLoopsList.length || !ClipperLib?.Clipper) {
    return [];
  }
  const subject = [];
  for (const loops of profileLoopsList) {
    if (!Array.isArray(loops)) continue;
    for (const loop of loops) {
      const path = toClipperPath(loop);
      if (path) subject.push(path);
    }
  }
  if (!subject.length) return [];
  const clip = new ClipperLib.Clipper();
  clip.AddPaths(subject, ClipperLib.PolyType.ptSubject, true);
  const tree = new ClipperLib.PolyTree();
  const ok = clip.Execute(
    ClipperLib.ClipType.ctUnion,
    tree,
    ClipperLib.PolyFillType.pftEvenOdd,
    ClipperLib.PolyFillType.pftEvenOdd
  );
  if (!ok) return [];
  const exPolys = ClipperLib.JS?.PolyTreeToExPolygons ? ClipperLib.JS.PolyTreeToExPolygons(tree) : [];
  const out = [];
  for (const ex of exPolys || []) {
    const outer = fromClipperPath(ex?.outer);
    if (!outer || outer.length < 3) continue;
    const holes = [];
    for (const hole of ex?.holes || []) {
      const loop = fromClipperPath(hole);
      if (loop && loop.length >= 3) holes.push(loop);
    }
    out.push({
      outer: ensureLoopWinding(outer, true),
      holes: holes.map((loop) => ensureLoopWinding(loop, false))
    });
  }
  return out;
}
function pointInLoop(point, loop) {
  if (!point || !Array.isArray(loop) || loop.length < 3) return false;
  let inside = false;
  for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) {
    const xi = Number(loop[i]?.x || 0);
    const yi = Number(loop[i]?.y || 0);
    const xj = Number(loop[j]?.x || 0);
    const yj = Number(loop[j]?.y || 0);
    const intersects = yi > point.y !== yj > point.y && point.x < (xj - xi) * (point.y - yi) / (yj - yi || 1e-12) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}
function pointInRegion(point, region) {
  if (!point || !region?.outer) return false;
  if (!pointInLoop(point, region.outer)) return false;
  const holes = Array.isArray(region.holes) ? region.holes : [];
  for (const hole of holes) {
    if (pointInLoop(point, hole)) return false;
  }
  return true;
}
function loopCentroid(loop) {
  if (!Array.isArray(loop) || loop.length < 3) return null;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const p of loop) {
    if (!p) continue;
    sx += Number(p.x || 0);
    sy += Number(p.y || 0);
    n++;
  }
  if (!n) return null;
  return { x: sx / n, y: sy / n };
}
async function rebuildGeneratedSolidsFromSnapshot(snapshot, options = {}) {
  const builtFeatures = Array.isArray(snapshot?.builtFeatures) ? snapshot.builtFeatures : [];
  const sketchPlanes = snapshot?.sketchPlanes || {};
  const solids = [];
  const meshCache = /* @__PURE__ */ new Map();
  let bodySeq = 0;
  for (const feature of builtFeatures) {
    if (feature?.type === "extrude") {
      const profiles = Array.isArray(feature?.input?.profiles) ? feature.input.profiles : [];
      if (!profiles.length) continue;
      const params = feature?.params || {};
      const depth = Math.max(1e-4, Math.abs(Number(params.depth ?? params.distance ?? 1)));
      const symmetric = params.symmetric === true;
      const direction = params.direction === "reverse" ? "reverse" : "normal";
      const operation = ["new", "add", "subtract"].includes(String(params.operation || "new")) ? String(params.operation || "new") : "new";
      const localZShift = symmetric ? -depth / 2 : direction === "reverse" ? -depth : 0;
      const createdBodyIds = [];
      const bySketch = /* @__PURE__ */ new Map();
      for (const profileTarget of profiles) {
        const { sketchId, profileId } = resolveProfileTargetRef(profileTarget);
        if (!sketchId || !profileId) continue;
        const profileLoops = profileLoopsFromSnapshot(snapshot, profileTarget);
        if (!profileLoops?.length) continue;
        const basis = basisFromPlaneFrame(sketchPlanes?.[sketchId] || {});
        if (!bySketch.has(sketchId)) {
          bySketch.set(sketchId, { sketchId, basis, entries: [] });
        }
        bySketch.get(sketchId).entries.push({ profileTarget, profileLoops });
      }
      for (const sketchPack of bySketch.values()) {
        const resolvedRegions = unionSelectedRegions(sketchPack.entries.map((e) => e.profileLoops));
        for (const region of resolvedRegions) {
          const polygons = [
            region.outer,
            ...region.holes || []
          ].map((loop) => loop.map((p) => [p.x || 0, p.y || 0]));
          if (!polygons.length) continue;
          const bodyIndex = bodySeq++;
          const id = makeBodyId(feature.id, bodyIndex);
          let primaryTarget = null;
          const contributingProfileKeys = [];
          for (const entry of sketchPack.entries) {
            const { key } = resolveProfileTargetRef(entry?.profileTarget || {});
            if (!key) continue;
            let contributes = false;
            const loops = Array.isArray(entry?.profileLoops) ? entry.profileLoops : [];
            for (const loop of loops) {
              const sample = loopCentroid(loop);
              if (sample && pointInRegion(sample, region)) {
                contributes = true;
                break;
              }
            }
            if (contributes) {
              contributingProfileKeys.push(key);
              if (!primaryTarget) primaryTarget = entry.profileTarget || null;
            }
          }
          if (!primaryTarget) {
            primaryTarget = sketchPack.entries[0]?.profileTarget || null;
          }
          const primaryRef = resolveProfileTargetRef(primaryTarget || {});
          if (!contributingProfileKeys.length && primaryRef?.key) {
            contributingProfileKeys.push(primaryRef.key);
          }
          const body = {
            id,
            name: `${feature.name || "Extrude"}-${bodyIndex + 1}`,
            visible: feature.visible !== false,
            source: {
              feature_id: feature.id,
              feature_type: feature.type,
              profile: primaryTarget,
              profile_keys: contributingProfileKeys
            },
            provenance: buildSeedProvenance(feature, primaryTarget, bodyIndex),
            mesh: null,
            status: "pending_manifold"
          };
          const result = await extrudePolygons(polygons, depth);
          if (result?.mesh) {
            const meshWorld = transformMeshToWorld(result.mesh, sketchPack.basis, localZShift);
            body.status = "manifold_mesh_ready";
            body.mesh = {
              tri_count: (result.mesh?.triVerts?.length || 0) / 3,
              vert_count: (result.mesh?.vertProperties?.length || 0) / Math.max(1, result.mesh?.numProp || 3)
            };
            body.extrude = { depth, direction, symmetric };
            if (meshWorld) {
              meshWorld.source_solid_ids = [id];
              meshCache.set(id, meshWorld);
              createdBodyIds.push(id);
            }
            result.manifold?.delete?.();
          }
          solids.push(body);
        }
      }
      if ((operation === "add" || operation === "subtract") && createdBodyIds.length) {
        const targetIds = Array.isArray(feature?.input?.targets) ? feature.input.targets.map((id) => String(id || "")).filter(Boolean) : [];
        const createdSolids = createdBodyIds.map((id) => solids.find((s) => s?.id === id)).filter(Boolean);
        const targetSolids = targetIds.map((id) => solids.find((s) => s?.id === id)).filter(Boolean);
        const withSourceIds = (mesh, sid) => {
          if (!mesh) return null;
          const source = Array.isArray(mesh.source_solid_ids) && mesh.source_solid_ids.length ? mesh.source_solid_ids : [sid];
          return { ...mesh, source_solid_ids: source.map((id) => String(id || "")).filter(Boolean) };
        };
        const toolMeshes = createdSolids.map((s) => withSourceIds(meshCache.get(s.id), s.id)).filter((mesh) => mesh?.positions?.length && mesh?.indices?.length);
        const targetMeshes = targetSolids.map((s) => withSourceIds(meshCache.get(s.id), s.id)).filter((mesh) => mesh?.positions?.length && mesh?.indices?.length);
        let merge = null;
        if (operation === "add") {
          const meshes = [...targetMeshes, ...toolMeshes];
          if (meshes.length >= 2) merge = await booleanMeshes(meshes, "add");
        } else if (operation === "subtract") {
          if (targetMeshes.length && toolMeshes.length) {
            merge = await booleanMeshes({ mode: "subtract", targets: targetMeshes, tools: toolMeshes });
          }
        }
        if (merge?.mesh?.positions?.length && merge?.mesh?.indices?.length) {
          const consumed = /* @__PURE__ */ new Set([...targetSolids.map((s) => s.id), ...createdSolids.map((s) => s.id)]);
          const consumedSourceSolidIds = Array.from(consumed);
          const sketchIds = /* @__PURE__ */ new Set();
          for (const solid of [...targetSolids, ...createdSolids]) {
            for (const sid of getSketchIdsForSolid(solid)) {
              sketchIds.add(sid);
            }
            meshCache.delete(solid?.id);
          }
          const kept = solids.filter((s) => !consumed.has(s?.id));
          solids.length = 0;
          solids.push(...kept);
          const bodyIndex = bodySeq++;
          const id = makeBodyId(feature.id, bodyIndex);
          const body = {
            id,
            name: `${feature.name || "Extrude"}-${bodyIndex + 1}`,
            visible: feature.visible !== false,
            source: {
              feature_id: feature.id,
              feature_type: feature.type,
              operation,
              targets: targetIds,
              tools: createdBodyIds,
              sketch_ids: Array.from(sketchIds)
            },
            provenance: {
              source: {
                feature_id: feature.id,
                feature_type: feature.type,
                operation,
                targets: targetIds,
                tools: createdBodyIds
              },
              parents: [...targetIds, ...createdBodyIds]
            },
            mesh: {
              tri_count: (merge.mesh?.indices?.length || 0) / 3,
              vert_count: (merge.mesh?.positions?.length || 0) / 3
            },
            status: "manifold_extrude_boolean_ready"
          };
          merge.mesh.source_solid_ids = consumedSourceSolidIds;
          meshCache.set(id, merge.mesh);
          solids.push(body);
        }
      }
      continue;
    }
    if (feature?.type === "boolean") {
      const mode = String(feature?.params?.mode || "add");
      const targets = Array.isArray(feature?.input?.targets) ? feature.input.targets.map((id) => String(id || "")).filter(Boolean) : [];
      const tools = Array.isArray(feature?.input?.tools) ? feature.input.tools.map((id) => String(id || "")).filter(Boolean) : [];
      const selectedIds = mode === "subtract" ? Array.from(/* @__PURE__ */ new Set([...targets, ...tools])) : targets.slice();
      if (!selectedIds.length) continue;
      const selectedSet = new Set(selectedIds);
      const targetSolids = targets.map((id) => solids.find((s) => s?.id === id)).filter(Boolean);
      const toolSolids = tools.map((id) => solids.find((s) => s?.id === id)).filter(Boolean);
      if (mode === "subtract") {
        if (!targetSolids.length || !toolSolids.length) continue;
      } else if (targetSolids.length < 2) {
        continue;
      }
      const withSourceIds = (mesh, sid) => {
        if (!mesh) return null;
        const source = Array.isArray(mesh.source_solid_ids) && mesh.source_solid_ids.length ? mesh.source_solid_ids : [sid];
        return { ...mesh, source_solid_ids: source.map((id) => String(id || "")).filter(Boolean) };
      };
      const targetMeshes = targetSolids.map((s) => withSourceIds(meshCache.get(s.id), s.id)).filter((mesh) => mesh?.positions?.length && mesh?.indices?.length);
      const toolMeshes = toolSolids.map((s) => withSourceIds(meshCache.get(s.id), s.id)).filter((mesh) => mesh?.positions?.length && mesh?.indices?.length);
      if (mode === "subtract") {
        if (!targetMeshes.length || !toolMeshes.length) continue;
      } else if (targetMeshes.length < 2) {
        continue;
      }
      const sketchIds = /* @__PURE__ */ new Set();
      for (const solid of [...targetSolids, ...toolSolids]) {
        for (const sid of getSketchIdsForSolid(solid)) sketchIds.add(sid);
      }
      const result = mode === "subtract" ? await booleanMeshes({ mode, targets: targetMeshes, tools: toolMeshes }) : await booleanMeshes(targetMeshes, mode);
      const kept = solids.filter((s) => !selectedSet.has(s?.id));
      for (const target of [...targetSolids, ...toolSolids]) meshCache.delete(target?.id);
      solids.length = 0;
      solids.push(...kept);
      if (result?.mesh?.positions?.length && result?.mesh?.indices?.length) {
        const bodyIndex = bodySeq++;
        const id = makeBodyId(feature.id, bodyIndex);
        const body = {
          id,
          name: `${feature.name || "Boolean"}-${bodyIndex + 1}`,
          visible: feature.visible !== false,
          source: {
            feature_id: feature.id,
            feature_type: feature.type,
            targets,
            tools,
            solids: selectedIds,
            mode,
            sketch_ids: Array.from(sketchIds)
          },
          provenance: {
            source: {
              feature_id: feature.id,
              feature_type: feature.type,
              targets,
              tools,
              solids: selectedIds,
              mode
            },
            parents: selectedIds
          },
          mesh: {
            tri_count: (result.mesh?.indices?.length || 0) / 3,
            vert_count: (result.mesh?.positions?.length || 0) / 3
          },
          status: "manifold_boolean_ready"
        };
        result.mesh.source_solid_ids = selectedIds.slice();
        meshCache.set(id, result.mesh);
        solids.push(body);
      }
      continue;
    }
    if (feature?.type === "chamfer") {
      const bodySeqRef = { value: bodySeq };
      const changed = await applyChamferFeature(
        solids,
        meshCache,
        feature,
        makeBodyId,
        bodySeqRef
      );
      bodySeq = bodySeqRef.value;
      if (changed) {
      }
    }
  }
  return { solids, meshCache };
}

// src/void/worker/solids_worker.js
var kernelReady = false;
async function ensureReady() {
  if (kernelReady) return;
  await ensureKernel();
  kernelReady = true;
}
function serializeMeshCache(meshCache) {
  const meshes = [];
  const transfer = [];
  for (const [id, mesh] of meshCache.entries()) {
    if (!id || !mesh?.positions?.length || !mesh?.indices?.length) continue;
    const positions = mesh.positions instanceof Float32Array ? mesh.positions : new Float32Array(mesh.positions);
    const indices = mesh.indices instanceof Uint32Array ? mesh.indices : new Uint32Array(mesh.indices);
    meshes.push({ id, positions, indices });
    transfer.push(positions.buffer, indices.buffer);
    const optionalUint = ["mergeFromVert", "mergeToVert", "runIndex", "runOriginalID", "faceID"];
    for (const key of optionalUint) {
      if (!mesh?.[key]?.length) continue;
      const arr = mesh[key] instanceof Uint32Array ? mesh[key] : new Uint32Array(mesh[key]);
      meshes[meshes.length - 1][key] = arr;
      transfer.push(arr.buffer);
    }
    const optionalFloat = ["halfedgeTangent", "runTransform"];
    for (const key of optionalFloat) {
      if (!mesh?.[key]?.length) continue;
      const arr = mesh[key] instanceof Float32Array ? mesh[key] : new Float32Array(mesh[key]);
      meshes[meshes.length - 1][key] = arr;
      transfer.push(arr.buffer);
    }
    if (mesh?.run_source_solid_ids && typeof mesh.run_source_solid_ids === "object") {
      meshes[meshes.length - 1].run_source_solid_ids = mesh.run_source_solid_ids;
    }
    if (Array.isArray(mesh?.source_solid_ids)) {
      meshes[meshes.length - 1].source_solid_ids = mesh.source_solid_ids;
    }
  }
  return { meshes, transfer };
}
self.onmessage = async (event) => {
  const msg = event?.data || {};
  const id = msg?.id ?? null;
  const type = msg?.type || "";
  if (type !== "rebuild") {
    self.postMessage({ id, ok: false, error: `unknown message type: ${type}` });
    return;
  }
  try {
    await ensureReady();
    const result = await rebuildGeneratedSolidsFromSnapshot(msg.snapshot || {}, {
      reason: msg.reason || "worker"
    });
    const { meshes, transfer } = serializeMeshCache(result?.meshCache || /* @__PURE__ */ new Map());
    self.postMessage({
      id,
      ok: true,
      solids: result?.solids || [],
      meshes
    }, transfer);
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error?.message || String(error || "unknown worker error")
    });
  }
};
