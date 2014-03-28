//Author: Surya Nyayapati
//Date: 2014-03-21
//Version: 0.0.1
(function (window, undefined) {
    
    var nsr = window.nsr = window.nsr || {};
    
    nsr.isArray = function(obj){
        if (Array.isArray)
            return Array.isArray(obj);
        else
            return Object.prototype.toString.call( obj ) === '[object Array]';
    }
    
    nsr.indexedDB = nsr.indexedDB || {};    
    
    var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
     // (Mozilla has never prefixed these objects, so we don't need window.mozIDB*) and opera has become webkit based
    var IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
    var IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
    var IDBCursor = window.IDBCursor || window.webkitIDBCursor || window.msIDBCursor;
    
    var TransactionType = { READ_ONLY: "readonly", READ_WRITE: "readwrite" }//0,1        
    var CursorType = { NEXT: "next", NEXT_NO_DUPLICATE: "nextunique", PREV: "prev", PREV_NO_DUPLICATE:"prevunique"}//0,1,2,3
    
    ///Common Global IndexedDB
    nsr.indexedDB.onError = function (e, callback){
        console.log("onError: in", e);
        if (callback) {
            callback(-1);//error
        }
    }
    
    nsr.indexedDB.SchemaModel = function(dbName, dbVersion){
        this.dbName = dbName;
        this.dbVersion = dbVersion;
        this.dbStores = {};
        this.storesCount = 0;
        this.dbStoreMap = [];
        //this.dbData can import the whole db         
        this.dbData = '';//dictionary<storeName,Array<data>>
    }
    
    nsr.indexedDB.SchemaModel.prototype.AddStore = function(storeName, keyPath, isAutoIncrement, preserveData){
        this.storesCount= this.storesCount+1;
        this.dbStores[storeName] = {'storeName': storeName,'keyPath': keyPath,'isAutoIncrement': isAutoIncrement,'indexes':[],'storeCounter':this.storesCount,'preserveData':preserveData||false};        
        this.dbStoreMap[this.storesCount] = storeName;
    } 
    
    nsr.indexedDB.SchemaModel.prototype.AddIndex = function(storeName, indexName, indexField, isUnique){
        if(storeName in this.dbStores)
            this.dbStores[storeName]['indexes'].push({ 'indexName': indexName,'indexField': indexField,'isUnique': isUnique});
        else
            throw new Error('Missing Store ('+storeName + '). Call AddStore() to Add store');
    }
    
    nsr.indexedDB.SchemaModel.prototype.AddAllData = function(json){
        //this.dbData can import the whole db         
        this.dbData = json;//dictionary<storeName,Array<data>>
    }
    
    nsr.indexedDB.backup ={};
    
    nsr.indexedDB.Open = function (schemas /*Array of nsr.indexedDB.SchemaModel */, callback /* function(result) -1,0,1*/) { 
         var DropObjectStore = function (db, storeName) {
                if (db && db.objectStoreNames.contains(storeName)) {
                    db.deleteObjectStore(storeName);
                    console.log('objectstore ' + storeName + ' dropped');
                }
            }
    
        var CreateObjectStore = function (db, store) {
            if (db && !db.objectStoreNames.contains(store.storeName)) {
                var objectStore = db.createObjectStore(store.storeName, { keyPath: store.keyPath, autoIncrement: store.isAutoIncrement});
                for(var indexIdx = 0; indexIdx < store.indexes.length; indexIdx++ ){
                    if(objectStore.indexNames.contains(store.indexes[indexIdx].indexName)){
                        objectStore.deleteIndex(store.indexes[indexIdx].indexName);
                    }
                    objectStore.createIndex(store.indexes[indexIdx].indexName, store.indexes[indexIdx].indexField, { unique:  store.indexes[indexIdx].isUnique });
                }   
                console.log('objectstore ' + store.storeName + ' created');
            }
        }
        
        if(schemas && nsr.isArray(schemas) && schemas.length > 0)
        {    
            var schema0 = schemas[schemas.length - 1];//set version with latest version
            var dbOpenRequest = indexedDB.open(schema0.dbName, schema0.dbVersion);
            
            dbOpenRequest.onblocked = function (e) {
                // If some other tab is loaded with the database, then it needs to be closed
                // before we can proceed.
                if(callback)
                    callback(-1,'Close all tabs, before proceeding'); 
            };
            
            //onupgradeneeded will be called first if there is a version change and then success will be called
            dbOpenRequest.onupgradeneeded = function (e) {          
                var db = nsr.indexedDB.db = e.target.result;                
                var transaction = e.target.transaction;//VERSION_CHANGE mode
                //use the same transaction to do multiple things??
                for(var verIdx = 0; verIdx < schemas.length; verIdx++ ){
                    var schema = schemas[verIdx];                    
                    if(e.oldVersion <= schema.dbVersion){                        
                        for(storeKey in schema.dbStores){
                            var store = schema.dbStores[storeKey];
                            try{
                                if(db.objectStoreNames.contains(store.storeName)){ 
                                  nsr.indexedDB.backup[store.storeName] = [];
                                  var backupRequest = transaction.objectStore(store.storeName).openCursor();
                                  backupRequest.onsuccess = function(e){ 
                                    var cursor = e.target.result;
                                    if (cursor){
                                      nsr.indexedDB.backup[store.storeName].push(cursor.value);
                                      cursor.continue();
                                    }else
                                    {
                                        DropObjectStore(db, store.storeName);
                                        CreateObjectStore(db, store);
                                    }
                                  };
                                }else{
                                    CreateObjectStore(db, store);
                                }
                                
                            }catch(ex){
                                console.log(ex);
                            }                            
                        }
                    }
                }
                transaction.oncomplete = function() {
                    var schema = schemas[schemas.length - 1];                     
                    //console.log('dbOpenRequest transaction Complete ',schema);
                    
                    if(schema.dbData){
                        //bulk insert data since all stores are created
                        nsr.indexedDB.ImportDB(schema.dbData, [], function (st){
                            //console.log('import Complete status ',st);
                            if(callback)
                                callback(1,'Created '+ nsr.indexedDB.db.name +' and import Complete with version:'+nsr.indexedDB.db.version); 
                        });
                    }
                    else{
                        if(callback)
                            callback(1,'Created '+ nsr.indexedDB.db.name +' with version:'+nsr.indexedDB.db.version); 
                    }    
                    //nsr.indexedDB.backup
                };                
            };
            
            dbOpenRequest.onsuccess = function (e) {  
                nsr.indexedDB.db = e.target.result;
                //console.log(nsr.indexedDB.db.objectStoreNames);
                if(callback)
                    callback(0,'Opened '+ nsr.indexedDB.db.name +' with version:'+nsr.indexedDB.db.version);    
            };
            
            dbOpenRequest.onerror = function(e) {
                nsr.indexedDB.onError(e, callback);
            }
        }
        else
        {
            if(callback)
                callback(-1,'schemas (array of nsr.indexedDB.SchemaModel) is required');
        }
    }
    
    nsr.indexedDB.Close = function(callback){
        try {
            var db = nsr.indexedDB.db;
            if (db) {
                db.close();
                nsr.indexedDB.db = null;
                if (callback) {
                    callback(1);
                }
            }   
        } catch (ex) {
            if (callback) {
                callback(-1);
            }
            console.log("Exception in Close() - " + ex.message);
        }
    } 
    
    //doesnot work in webkit
    nsr.indexedDB.DeleteDatabase = function(dbName, callback){  
        console.log('inside nsr.indexedDB.DeleteDatabase');
        
        var deleteReq = window.indexedDB.deleteDatabase(dbName);
        deleteReq.onsuccess = function(){
            //console.log("Database deleted");
            callback(1,'Database deleted');
        };
        deleteReq.onblocked = function (e) {
          //console.log("db Blocked!: ", e);   
          callback(0,'db Blocked! Close all tabs.');          
        };
        deleteReq.onerror = function(e){
            //console.log("Could not delete database. Database may not exist");
            callback(-1,'Could not delete database. Database may not exist');
        };    
    }
    
   
    
    //operator can be string i.e ">=" or  ">= && <=" etc.
    //values is array with at least one or max of two entries
    nsr.indexedDB.GetKeyRange = function(operator, values) {
        var range = null;
        operator = (operator || '').replace(/(^\s+|\s+$)/g, '');//trim whitspace
        switch (operator) {
          case "=":
            range = IDBKeyRange.only(values[0]);
            break;
          case "<":
            range = IDBKeyRange.upperBound(values[0], true);
            break;
          case "<=":
            range = IDBKeyRange.upperBound(values[0]);
            break;
          case ">":
            range = IDBKeyRange.lowerBound(values[0], true);
            break;
          case ">=":
            range = IDBKeyRange.lowerBound(values[0]);
            range.upperOpen = true;
            break;            
          case "> && <":
            range = IDBKeyRange.bound(values[0], values[1], true, true);
            break;
          case ">= && <=":
            //IDBKeyRange.bound(searchTerm, searchTerm + '\uffff') It'd be better to use \uffff as your dagger rather than z. You won't get search results like "wikipædia" when searching for "wiki" if you use z...
            range = IDBKeyRange.bound(values[0], values[1]);
            break;
         case "> && <=":
            range = IDBKeyRange.bound(values[0], values[1], true, false);
            break;
          case ">= && <":
            range = IDBKeyRange.bound(values[0], values[1], false, true);
            break;   
        }
        return range;
    }
    
    nsr.indexedDB.ClearAll = function(storeName, callback){
        var db = nsr.indexedDB.db;
        if (db && db.objectStoreNames.contains(storeName)) {
            var clearTransaction = db.transaction([storeName], TransactionType.READ_WRITE);
            var clearRequest = clearTransaction.objectStore(storeName).clear();
            clearRequest.onsuccess = function(event){
                 //event.target.result contains undefined
                 if (callback) {
                    callback(true);
                 }
            };
            clearRequest.onerror = function(event){            
                 nsr.indexedDB.onError(event,callback);
            };
        }else {
            console.log(storeName+ " doesnot exist ");
            if (callback) {
                    callback(false);
            }
        }
    }
           
    nsr.indexedDB.Delete = function(storeName, key, callback){
        var db = nsr.indexedDB.db;
        if(db){
            var request = db.transaction(storeName, TransactionType.READ_WRITE)  
                    .objectStore(storeName)  
                    .delete(key);  
            request.onsuccess = function(event) {  
              if(callback){
                    //console.log(results);
                    callback(true);
                }  
            };
            request.onerror = function(event) {  
              nsr.indexedDB.onError(event,callback);
            };
        }    
    }
    
    //operator can be string i.e ">=" or  ">= && <=" etc.
    //values is array with at least one or max of two entries
    nsr.indexedDB.DeleteRange = function(storeName, indexName, operator, values, callback){        
        var db = nsr.indexedDB.db;
        if(db){
            var transaction = db.transaction([storeName], TransactionType.READ_WRITE);
            transaction.oncomplete = function(event) {  
              if(callback){
                callback(true);
              }
            }; 
            transaction.onerror = function(e) {nsr.indexedDB.onError(e, callback);}
            var store = transaction.objectStore(storeName);

            var Index = store.index(indexName);
            var cursorRequest = Index.openCursor(nsr.indexedDB.GetKeyRange(operator, values));
            cursorRequest.onsuccess = function(ev) {
              var cursor = cursorRequest.result;
              if (cursor) {                        
                cursor.delete();
                cursor.continue();
              }
            };
        }    
    }
    
    nsr.indexedDB.GetObj = function(storeName, key, callback){
        var db = nsr.indexedDB.db;
        if(db){
            var transaction = db.transaction([storeName], TransactionType.READ_ONLY);  
            var obj = undefined;
            transaction.oncomplete = function(event) {              
                if(callback){
                    callback(obj);
                }
            }; 
            var objectStore = transaction.objectStore(storeName);  
            var request = objectStore.get(key);  
            request.onerror = function(e) {nsr.indexedDB.onError(e, callback);}
            request.onsuccess = function(event) {  
                obj = request.result;            
            };
        }    
    }
    
    nsr.indexedDB.SetObj = function(storeName, obj, callback){
        if(obj){
            var db = nsr.indexedDB.db;
            if(db){
                var transaction = db.transaction([storeName], TransactionType.READ_WRITE);
                
                var store = transaction.objectStore(storeName);
                var request = store.put(obj);  
                request.onerror = function(e) {nsr.indexedDB.onError(e, callback);}
                request.onsuccess = function(event) {  
                    if(callback){
                        callback(true);
                    }
                };
            }    
        }
        else {
            if(callback){
                callback(false);
              }
        }
    }
    
    //objOrArray if "property key" will output dictionary, if falsy will output array
    nsr.indexedDB.ListAll = function(storeName, objOrArray, callback){
        var db = nsr.indexedDB.db;
        if (db && db.objectStoreNames.contains(storeName)) {
            var transaction = db.transaction(storeName, TransactionType.READ_ONLY);
            var list = objOrArray ? {} : [] ;
            transaction.oncomplete = function(event) {
                if(callback){
                    //console.log(results);
                    callback(list);
                }
            };
            transaction.onerror = function(e) {nsr.indexedDB.onError(e, callback);}
            var cursorRequest = transaction.objectStore(storeName).openCursor();
            
            cursorRequest.onsuccess = function(ev) {
                var cursor = cursorRequest.result || ev.target.result;
                if(!!cursor == false)
                    return;
                if(objOrArray){
                    list[cursor.value[objOrArray]] = cursor.value;
                }
                else{
                    list.push(cursor.value);                
                }
                cursor.continue();
            };      
        }else {
            console.log(storeName+ " doesnot exist ");
            if (callback) {
                    callback(false);
            }                 
        }       
    }
    
    //operator can be string i.e ">=" or  ">= && <=" etc.
    //values is array with at least one or max of two entries
    //orderbyDesc boolean
    nsr.indexedDB.FindObjList = function(storeName, indexName, operator, values, orderbyDesc, callback){
        var resultset = [];
        var db = nsr.indexedDB.db;
        if(db){
            var transaction = db.transaction([storeName], TransactionType.READ_ONLY);
            transaction.oncomplete = function(event) {  
              if(callback){
                callback(resultset);
              }
            }; 
            transaction.onerror = function(e) {nsr.indexedDB.onError(e, callback);}
            var store = transaction.objectStore(storeName);
            var cursorRequest = null;
            if(indexName)
            {
                var Index = store.index(indexName);
                cursorRequest = orderbyDesc ? Index.openCursor(nsr.indexedDB.GetKeyRange(operator, values), CursorType.PREV) : Index.openCursor(nsr.indexedDB.GetKeyRange(operator, values));
            }
            else
            {
                cursorRequest = orderbyDesc ? store.openCursor(nsr.indexedDB.GetKeyRange(operator, values), CursorType.PREV) : store.openCursor(nsr.indexedDB.GetKeyRange(operator, values));
            }
            
            cursorRequest.onsuccess = function(ev) {
              var cursor = cursorRequest.result;
              if (cursor) {
                resultset.push(cursor.value);
                //console.log(cursor.value);
                cursor.continue();
              }          
            };
        }    
    }  
    
    //operator can be string i.e ">=" or  ">= && <=" etc.
    //values is array with at least one or max of two entries
    //orderbyDesc boolean
    //limit integer
    nsr.indexedDB.FindObjListLimit = function(storeName, indexName, operator, values, orderbyDesc, limit, callback){
        var resultset = [];
        var db = nsr.indexedDB.db;
        if(db){
            var transaction = db.transaction([storeName], TransactionType.READ_ONLY);
            transaction.oncomplete = function(event) {  
              if(callback){
                callback(resultset);
              }
            }; 
            transaction.onabort = function(event) {
                if(callback){                
                    callback(resultset);
                }
            };
            transaction.onerror = function(e) {nsr.indexedDB.onError(e, callback);}
            var store = transaction.objectStore(storeName);
            var cursorRequest = null;
            if(indexName)
            {
                var Index = store.index(indexName);
                cursorRequest = orderbyDesc ? Index.openCursor(nsr.indexedDB.GetKeyRange(operator, values), CursorType.PREV) : Index.openCursor(nsr.indexedDB.GetKeyRange(operator, values));
            }
            else
            {
                cursorRequest = orderbyDesc ? store.openCursor(nsr.indexedDB.GetKeyRange(operator, values), CursorType.PREV) : store.openCursor(nsr.indexedDB.GetKeyRange(operator, values));
            }
            
            cursorRequest.onsuccess = function(ev) {
                var cursor = cursorRequest.result;
                if (cursor) 
                {
                    if(limit>0){
                        resultset.push(cursor.value);
                        limit--;
                        //console.log(cursor.value);
                        cursor.continue();
                    }
                    else
                    {
                        try{
                            transaction.abort();
                        }catch(e){
                            console.log(e);
                        }
                    }                
                }          
            };
        }    
    }
    
    //Adding is done asynchronously (UI should not be stuck)
    //callback is called after each insert for status obj 
    //with properties (current:integer,total:integer,isComplete:bool)
    nsr.indexedDB.AddList = function (storeName, list, callback) {
        //no need to clear, since its add or update.        
        var db = nsr.indexedDB.db;
        if(db){
            var transaction = db.transaction([storeName], TransactionType.READ_WRITE);
            var count = 0;
            transaction.oncomplete = function (event) {
                if (callback) {
                    console.log('Added ' + count + '/' + list.length);
                    callback({"current": count, "total": list.length,"isComplete" : true});
                }
            };
            transaction.onabort = function(event) {  
                if(callback){
                    callback({"current": count, "total": list.length,"isComplete" : true});                    
                }
            }; 
            transaction.onerror = function(e) {nsr.indexedDB.onError(e, callback);}       
            
            var store = transaction.objectStore(storeName);   
            if(list.length == 0){
                transaction.abort();
                return;
            }        
            putNext();
            //not using foreach since UI becomes unresponsive for large list
            function putNext() {
                if (count < list.length) {
                    store.put(list[count]).onsuccess = putNext;
                    ++count;
                    if(callback){//called multiple times, false means not complete 
                        callback({"current": count, "total": list.length,"isComplete" : false});                        
                    }
                } else {   // complete
                    console.log('populate complete');
                    //transaction.oncomplete should trigger
                }
            }           
        }    
    };
    
    //operator can be string i.e ">=" or  ">= && <=" etc.
    //values is array with at least one or max of two entries
    //orderbyDesc boolean
    //limit integer
    nsr.indexedDB.GetKeyList = function(storeName, indexName, operator, values, orderbyDesc, callback){
        var db = nsr.indexedDB.db;
        if(db){
            var transaction = db.transaction([storeName], TransactionType.READ_ONLY);
            var list = [];
            transaction.oncomplete = function(event) {
                if(callback){
                    callback(list);
                }
            };
            transaction.onerror = function(e) {nsr.indexedDB.onError(e, callback);}
            var store = transaction.objectStore(storeName);
            // Get everything in the store;
            var cursorRequest = null;
            if(indexName)
            {
                var Index = store.index(indexName);
                cursorRequest = orderbyDesc ? Index.openCursor(nsr.indexedDB.GetKeyRange(operator, values), CursorType.PREV) : Index.openCursor(nsr.indexedDB.GetKeyRange(operator, values));
            }
            else
            {
                cursorRequest = orderbyDesc ? store.openCursor(null, CursorType.PREV) : store.openCursor();
            }
            
            cursorRequest.onsuccess = function(ev) {
                var cursor = cursorRequest.result || ev.target.result;
                if(!!cursor == false)
                    return;

                list.push(cursor.key);
                cursor.continue();
            };
        }    
    }
    
    //operator can be string i.e ">=" or  ">= && <=" etc.
    //values is array with at least one or max of two entries
    //orderbyDesc boolean
    //limit integer
    nsr.indexedDB.GetUniqueKeyList = function(storeName, indexName, operator, values, orderbyDesc, callback){
        var db = nsr.indexedDB.db;
        if(db){
            var resultset = [];
            var transaction = db.transaction([storeName], TransactionType.READ_ONLY);
            transaction.oncomplete = function(event) {  
              if(callback){
                callback(resultset);
              }
            }; 
            transaction.onerror = function(e) {nsr.indexedDB.onError(e, callback);}
            var store = transaction.objectStore(storeName);

            var countryIndex = store.index(indexName);
            var cursorRequest = null;
            if(operator)
            {
                cursorRequest = countryIndex.openKeyCursor(nsr.indexedDB.GetKeyRange(operator, values), CursorType.NEXT_NO_DUPLICATE);
            }
            else
            {
                cursorRequest = countryIndex.openKeyCursor(null, CursorType.NEXT_NO_DUPLICATE);
            }        
            
            cursorRequest.onsuccess = function(ev) {
              var cursor = cursorRequest.result;
              if (cursor) {
                resultset.push(cursor.key);
                //console.log(cursor.value);//undefined
                cursor.continue();
              }
            };
        }
    }
    
    //Export the database as json
    //excludeList:array contains storenames to skip
    nsr.indexedDB.ExportDB = function(excludeList, callback){
        var db = nsr.indexedDB.db;
        if(db){
            var storeList = db.objectStoreNames;
            console.log(storeList);
            var obj = {};          
            excludeList = excludeList || [];
            for(var i=0;i<storeList.length;i++)
            {       
                nsr.indexedDB.ExportObjectStore(storeList[i], i, excludeList ,function(list, index){                                
                    obj[storeList[index]] = list;
                    //console.log(storeName,list);
                    
                    if(index+1==storeList.length && callback)
                    {
                        callback(JSON.stringify(obj));
                    }
                });
            }
        }
    };
    //Export single store as javascript list
    //index:integer only used for tracking
    //excludeList:array contains storenames to skip
    nsr.indexedDB.ExportObjectStore = function(storeName, trackIndex, excludeList, callback){
        var list = [];
        if(excludeList.indexOf(storeName)!=-1)
        {
            if(callback){
                callback(list, trackIndex);
            }
            return;
        }
        var db = nsr.indexedDB.db;
        if(db){
            var transaction = db.transaction(storeName, TransactionType.READ_ONLY);
            
            transaction.oncomplete = function(event) {
                //console.log(list);
                if(callback){
                    callback(list, trackIndex);
                } 
            };         
            var cursorRequest = transaction.objectStore(storeName).openCursor();
            cursorRequest.onsuccess = function(ev) {
                var cursor = cursorRequest.result || ev.target.result;
                if(!!cursor == false)
                    return;
                    
                list.push(cursor.value);                                
                cursor.continue();
            };   
        }    
    }
    //Import the database from json
    //excludeList:array contains storenames to skip
    nsr.indexedDB.ImportDB = function(json, excludeList, callback){
        var db = nsr.indexedDB.db;
        if(db){
            var storeList = db.objectStoreNames;            
            //console.log(storeList);
            var obj = (typeof json === 'string') ? JSON.parse(json) : json;             
            excludeList = excludeList || [];
            for(var i=0; i<storeList.length; i++)
            {   
                nsr.indexedDB.ImportObjectStore(storeList[i], obj[storeList[i]], i, excludeList, function(list, index){                                
                    obj[storeList[index]] = list;
                    //console.log(storeName,list);
                    
                    if(index+1==storeList.length && callback)
                    {
                        callback(obj);
                    }
                });
            }
        }    
    };
    //Import the database from storeName and List
    //index:integer only used for tracking
    //excludeList:array contains storenames to skip
    nsr.indexedDB.ImportObjectStore = function(storeName, storeObjList, trackIndex, excludeList, callback){        
        if(excludeList.indexOf(storeName)!=-1)
        {
            if(callback){
                callback(storeName, trackIndex, null);
            }
            return;
        }
        nsr.indexedDB.ClearAll(storeName,function(deleted){
            var db = nsr.indexedDB.db;
            if(db){
                var transaction = db.transaction(storeName, TransactionType.READ_WRITE);
                var count = 0;
                transaction.oncomplete = function(event) {  
                  if(callback){
                    callback(storeName, trackIndex, count);
                  }
                }; 
                transaction.onerror = function(e) {nsr.indexedDB.onError(e, callback);}
                var store = transaction.objectStore(storeName);                        
                                
                for(indexObj in storeObjList) {                
                    var request = store.put(storeObjList[indexObj]);
                    request.onsuccess = function(event) { 
                        count++;// event.target.result == keypath  
                    };
                }
            }    
        });
    }
    
} (window));
