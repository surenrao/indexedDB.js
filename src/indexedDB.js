//Author: Surya Nyayapati
//Date: 2014-03-21
//Version: 1.0.0
(function (environment, boildb, undefined) {
    "use strict";

    //creating globals so it can be mocked
    boildb.global = {
        indexedDB: environment.indexedDB || environment.mozIndexedDB || environment.webkitIndexedDB || environment.msIndexedDB,
        IDBTransaction: environment.IDBTransaction || environment.webkitIDBTransaction || environment.msIDBTransaction,
        IDBKeyRange: environment.IDBKeyRange || environment.webkitIDBKeyRange || environment.msIDBKeyRange,
        IDBCursor: environment.IDBCursor || environment.webkitIDBCursor || environment.msIDBCursor,
        console: environment.console
    };

    var getIndexedDB = function(){
        if(!boildb.global.indexedDB)
        {
            throw new Error("Current browser does not suppport indexedDB.");   
        }
        return boildb.global.indexedDB;
    }

    var TransactionType = { READ_ONLY: "readonly", READ_WRITE: "readwrite" };
    var CursorType = { NEXT: "next", NEXT_NO_DUPLICATE: "nextunique", PREV: "prev", PREV_NO_DUPLICATE:"prevunique"};
    
    var util = {};
    
    util.isArray = function(obj){
        if (Array.isArray)
            return Array.isArray(obj);
        else
            return Object.prototype.toString.call( obj ) === '[object Array]';
    }
    
    var _schema = null;
    var _db = null;
    var _version = null;
    var _dbName = null;
    
    boildb.getSchemaTemplate = function () {
        //https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
        //https://hacks.mozilla.org/2012/02/storing-images-and-files-in-indexeddb/
        //schema structure
          return {
               "dbName"   :"testDB",
               "version"  :1,//final version
               //contains all final stores for new users
               "stores"   :[{
                               "name"         :"storeName1",
                               "primaryField" :"field1",
                               "autoIncrement":false,
                               "indexes"      :[{
                                   "name":"idx_field2",
                                   "field":"field2",
                                   "unique":false,
                                   "multiEntry":false //can index a field which is an array(i.e. can do tags)
                               }]
                           }],
               "seedData": {"storeName1":[]}
           };
    }

    boildb.getUpgradeSchemaTemplate = function () {
        //contains all revision history for existing user
        //based on existing user backlog, start from where missed serially
        //order of operations: transform, drop, refresh, merge, seedData
        return [{
                    "version":1,
                    "refresh":[],//stores dropped and recreated
                    "merge":[], //stores are not dropped, but index and other properties are dropped and recreated
                    "drop":{"stores":[],"indexes":[]},//drop store and indexes
                    "transform":[{"srcStore":"","destStore":"","srcField":[],"destField":[]}],//copy and transfer data to new/existing store
                    "seedData": {},
                }];
    }
    boildb.Open = function (schema) {
        
        return new Promise(function(resolve, reject){
            if(!!schema){//save schema in memmory
                _schema = schema;
            }
            
            if(!_schema){
                reject(new Error('schema is not defined'));
            }
            boildb.global.console.debug('about to open...',_schema);
            
            try {
                boildb.Close();
                var dbOpenRequest = getIndexedDB().open(_schema.dbName, _schema.version);
            
                dbOpenRequest.onerror = function(err) {
                    boildb.global.console.debug('dbOpenRequest.onerror!', err);
                    reject(err);
                };
                dbOpenRequest.onblocked = function () {
                    boildb.global.console.debug('dbOpenRequest.onblocked!');
                    
                    reject(new Error("Database schema cannot be modified, its in use. Close all open connection."));
                };
                dbOpenRequest.onsuccess = function(event) {
                    _db = event.target.result;
                    _version = _schema.version;
                    _dbName = _schema.dbName;
                    boildb.global.console.debug('dbOpenRequest.onsuccess!', boildb);
                    resolve(new Session(_db));
                };
                dbOpenRequest.onupgradeneeded = function (event) {
                    boildb.global.console.debug("dbOpenRequest.onupgradeneeded!: ", event);
                    var db = event.target.result;//VERSION_CHANGE mode
                    var oldVersion = event.oldVersion;
                    var newVersion = event.newVersion;
                    var transaction = dbOpenRequest.transaction;//VERSION_CHANGE mode
                    
                    if (oldVersion === 0) {
                        //new user create everything. no need of revisions
                        var createPromises = [];
                        _schema.stores.forEach(function(store, index, strArray){
                            createPromises.push(CreateObjectStore(store, db, transaction));
                        });
                        Promise.all(createPromises).then(function(values) { 
                            boildb.global.console.debug('onupgradeneeded added',values);
                        }, function(addreason) {
                            boildb.global.console.debug('onupgradeneeded add err', addreason);
                        });  
                    }else{
                        //return user. there is db updates in revisions
                        var dropPromises = [];
                        var createPromises = [];
                        _schema.stores.forEach(function(store, index, strArray){
                            dropPromises.push(DropObjectStore(store.name, db));
                            createPromises.push(CreateObjectStore(store, db, transaction));
                        });
                        
                        Promise.all(dropPromises).then(function(values) { 
                            boildb.global.console.debug('onupgradeneeded deleted',values);
                            Promise.all(createPromises).then(function(values) { 
                            boildb.global.console.debug('onupgradeneeded added',values);
                            }, function(addreason) {
                            boildb.global.console.debug('onupgradeneeded add err', addreason);
                            });  
                        }, function(delreason) {
                        boildb.global.console.debug('onupgradeneeded del err', delreason);
                        });
                    }
                    transaction.oncomplete = function(event) {
                        boildb.global.console.debug('indexedDB.onupgradeneeded complete! ',event);
                        //do data init


                        //_schema.InitData(event.oldVersion, callback);
                        //if (oldVersion == 0) {
                        //    var count = Object.keys(schema.seedData).length;
                        //    for(storeName in schema.seedData){
                        //        boildb.AddList(storeName, schema.seedData[storeName])
                        //            .then(function success(){
                        //                count--;
                        //            },function error(){
                        //                count--;
                        //            });
                        //    }
                        //}else{
                        //    //todo
                        //}

                        
                        //should not close db once upgrade is over
                        //since if called then success is not called and error is invoked.
                        //db.close();
                        //resolve(1) //dont put resolve here since its not the end yet
                    };
                };
            } catch (error) {
                boildb.global.console.debug('surya err:',error);
                reject(error);
            }
        });
        
        function DropObjectStore(storeName, db) {
            return new Promise(function(resolve, reject){
                if (db.objectStoreNames.contains(storeName)) {
                    db.deleteObjectStore(storeName);
                    boildb.global.console.debug('objectstore ' + storeName + ' dropped');
                    resolve(true);
                }else{
                    boildb.global.console.debug("Doesnt exist! cannot delete ObjectStore ",storeName);
                    resolve(false);
                }
            });
        }
    
        function CreateObjectStore(storeSchema, db, transaction) {
            boildb.global.console.debug('CreateObjectStore',storeSchema);
            return new Promise(function(resolve, reject){
                var strParam = {};
                if(!!storeSchema.primaryField){
                    strParam.keyPath = storeSchema.primaryField;
                }   

                strParam.autoIncrement = (storeSchema.autoIncrement !== undefined) ? storeSchema.autoIncrement : false;
                //create new store or get reference if exists
                var store = null;
                if(db.objectStoreNames.contains(storeSchema.name)) {
                    store = transaction.objectStore(storeSchema.name);
                } else {
                    store = db.createObjectStore(storeSchema.name, strParam);
                }
                //delete existing indexes if any
                var indexNames = store.indexNames;
                for(var i=0;i<store.indexNames.length;i++){
                    store.deleteIndex(store.indexNames[i]);
                }
                //create new indexes if defined in schema
                if(!!storeSchema.indexes){
                    for(var i=0;i<storeSchema.indexes.length;i++){
                        var idxParam = {};
                        idxParam.unique = (storeSchema.indexes[i].unique !== undefined) ? idxParam.unique : false;
                        idxParam.multiEntry = (storeSchema.indexes[i].multiEntry !== undefined) ? idxParam.multiEntry : false;

                        store.createIndex(storeSchema.indexes[i].name, storeSchema.indexes[i].field, idxParam);
                    }
                }

                resolve(store);    
            });
        }
    };
    
    boildb.Close = function(){
        if(_db !== null){
            _db.close();
        }
    }

	boildb.Dispose = function(){
        boildb.Close();
        _schema = null;
        _db = null;
        _version = null;
        _dbName = null;
    }

    boildb.DeleteDatabase = function(dbName){
		boildb.global.console.debug('DeleteDatabase ', dbName || _dbName);
		return new Promise(function(resolve, reject){
            boildb.Close();
            var deleteReq = getIndexedDB().deleteDatabase(dbName || _dbName);
            deleteReq.onsuccess = function(){
                boildb.global.console.debug("Database deleted");
                resolve(true);
            };
            deleteReq.onblocked = function (e) {
              //alert("database blocked. Please close all tabs");
              boildb.global.console.debug("db Blocked!: ", e);
              reject(false, e);
            };
            deleteReq.onerror = function(e){
                //alert("Could not delete database. Database may not exist");
                reject(false, e);
            };
        });
    }
    
    var Session = function(db){
        var that = this;
        
        function GetKeyRange(operator, values) {
            //boildb.global.console.debug('GetKeyRange',operator, values);
            var range = null;
            switch (operator) {
              case "==":
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
                //IDBKeyRange.bound(searchTerm, searchTerm + '\uffff') It'd be better to use \uffff as your dagger rather than z. You won't get search results like "wikip�dia" when searching for "wiki" if you use z...
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
        
        this.Close = function(){
            if(!!db){
                db.close();
            }
        }

        this.GetObj = function(storeName, key){
            return new Promise(function(resolve, reject){
                if(!storeName || !key){
                    reject('storename or key cannot be empty');
                }else{
                    var transaction = db.transaction([storeName], transactionType.READ_ONLY);
                    var obj = null;
                    transaction.oncomplete = function(event) {
                        resolve(obj, storeName);
                    };
                    var objectStore = transaction.objectStore(storeName);
                    var request = objectStore.get(key);
                    request.onerror = function(e) { reject(e);}
                    request.onsuccess = function(event) {
                        obj = request.result;
                    };
                }
            });
        }

        this.SetObj = function(storeName, obj){
            return new Promise(function(resolve, reject){
                if(!storeName || !obj){
                    reject('storename or obj cannot be empty');
                }else{
                    var transaction = db.transaction([storeName], transactionType.READ_WRITE);

                    var store = transaction.objectStore(storeName);
                    var request = store.put(obj);
                    request.onerror = function(e) { reject(e);}
                    request.onsuccess = function(event) {
                        resolve(true);
                    };
                }
            });
        }
        
        this.ClearObjectStore = function(storeName){
            return new Promise(function(resolve, reject){
                if (db.objectStoreNames.contains(storeName)) {
                    var clearTransaction = db.transaction([storeName], transactionType.READ_WRITE);
                    var clearRequest = clearTransaction.objectStore(storeName).clear();
                    clearRequest.onsuccess = function(event){
                        resolve(true);
                    };
                    clearRequest.onerror = function(event){
                        reject(event);
                    };
                }else{
                    boildb.global.console.debug("Doesnt exist! cannot clear ObjectStore ",storeName);
                    reject(false);
                }
            });
        }

        this.ClearAllStores = function(skipStores){
            skipStores = skipStores || [];
            return new Promise(function(resolve, reject){
                var storeList = db.objectStoreNames;
                boildb.global.console.debug(storeList);

                var len = storeList.length - skipStores.length;
                var count = 0;
                for(var i=0;i<storeList.length;i++)
                {
                    if(skipStores.indexOf(storeList[i]) !== -1)//["listings","schedules"]
                    {
                        continue;
                    }
                    that.ClearAll(storeList[i],function(cleared){
                        count++;
                        if(len == count)
                        {
                            resolve(count, skipStores.length, storeList.length);
                        }
                    });
                }

                if(len == 0){
                    reject(null);
                }
            });
        }

        this.Delete = function(storeName, key){
            return new Promise(function(resolve, reject){
                if(!storeName || !key){
                    reject('storename or key cannot be empty');
                }else{
                    
                        var request = db.transaction(storeName, transactionType.READ_WRITE)
                                .objectStore(storeName)
                                .delete(key);
                        request.onsuccess = function(event) {
                            resolve(true);
                        };
                        request.onerror = function(event) {
                            reject(event);
                        };
                    
                }
            });
        }
        //Uses cursor
        this.DeleteRange = function(storeName, indexName, operator, values){  
            return new Promise(function(resolve, reject){
                if(!storeName || !indexName || !operator || !values){
                    reject('storeName, indexName, operator, values cannot be empty');
                }else{
                    
                        var transaction = db.transaction([storeName], transactionType.READ_WRITE);
                        transaction.oncomplete = function(event) {
                            resolve(true);
                        };
                        transaction.onerror = function(e) {reject(e);}
                        var store = transaction.objectStore(storeName);

                        var Index = store.index(indexName);
                        var cursorRequest = Index.openCursor(GetKeyRange(operator, values));
                        cursorRequest.onsuccess = function(ev) {
                            var cursor = cursorRequest.result;
                            if (cursor) {
                                cursor.delete();
                                cursor.continue();
                            }
                        };
                    
                }
            });
        }

        //Uses cursor
        this.ListAll = function(storeName, keyPath){
            keyPath = keyPath || false; 
            return new Promise(function(resolve, reject){
                if(!storeName){
                    reject('storename cannot be empty');
                }else{
                    var transaction = db.transaction(storeName, transactionType.READ_ONLY);
                    var list = !!keyPath ? {} : [];
                    transaction.oncomplete = function(event) {
                        resolve(list, storeName);
                    };
                    transaction.onerror = function(e) {reject(e);}
                    var cursorRequest = transaction.objectStore(storeName).openCursor();

                    cursorRequest.onsuccess = function(ev) {
                        var cursor = cursorRequest.result || ev.target.result;
                        if(!!cursor == false)
                            return;
                        if(!!keyPath){
                            list[cursor.value[keyPath]] = cursor.value;
                        }
                        else{
                            list.push(cursor.value);
                        }
                        cursor.continue();
                    };
                }
            });
        }

        //Uses cursor, if indexName is null then will search on whole objectStore
        this.FindObjList = function(storeName, indexName, operator, values, orderbyDesc){
            return new Promise(function(resolve, reject){
                if(!storeName || !operator || !values){
                    reject('storename, operator, values cannot be empty');
                }else{
                    var resultset = [];
                    var transaction = db.transaction([storeName], transactionType.READ_ONLY);
                    transaction.oncomplete = function(event) {
                      resolve(resultset, storeName);
                    };
                    transaction.onerror = function(e) {reject(e);}
                    var store = transaction.objectStore(storeName);
                    var cursorRequest = null;
                    if(!!indexName)
                    {
                        var Index = store.index(indexName);
                        cursorRequest = orderbyDesc ? 
                            Index.openCursor(GetKeyRange(operator, values), cursorType.PREV) : 
                            Index.openCursor(GetKeyRange(operator, values));
                    }
                    else
                    {
                        cursorRequest = orderbyDesc ? 
                            store.openCursor(GetKeyRange(operator, values), cursorType.PREV) : 
                            store.openCursor(GetKeyRange(operator, values));
                    }

                    cursorRequest.onsuccess = function(ev) {
                      var cursor = cursorRequest.result;
                      if (cursor) {
                        resultset.push(cursor.value);
                        //boildb.global.console.debug(cursor.value);
                        cursor.continue();
                      }
                    };
                }
            });
        }  

        //Uses openCursor, if indexName is null then will search on whole objectStore
        this.FindObjListLimit = function(storeName, indexName, operator, values, orderbyDesc, limit){
            return new Promise(function(resolve, reject){
                if(!storeName || !operator || !values){
                    reject('storename, operator, values cannot be empty');
                }else{
                    var resultset = [];
                    var transaction = db.transaction([storeName], transactionType.READ_ONLY);
                    transaction.oncomplete = function(event) {
                        resolve(resultset);
                    };
                    transaction.onabort = function(event) {
                        resolve(resultset);
                    };
                    transaction.onerror = function(e) {reject(e);}
                    var store = transaction.objectStore(storeName);
                    var cursorRequest = null;
                    if(indexName)
                    {
                        var Index = store.index(indexName);
                        cursorRequest = orderbyDesc ? 
                            Index.openCursor(GetKeyRange(operator, values), cursorType.PREV) : 
                            Index.openCursor(GetKeyRange(operator, values));
                    }
                    else
                    {
                        cursorRequest = orderbyDesc ? 
                            store.openCursor(GetKeyRange(operator, values), cursorType.PREV) : 
                            store.openCursor(GetKeyRange(operator, values));
                    }

                    cursorRequest.onsuccess = function(ev) {
                        var cursor = cursorRequest.result;
                        if (cursor)
                        {
                            if(limit>0){
                                resultset.push(cursor.value);
                                limit--;
                                //boildb.global.console.debug(cursor.value);
                                cursor.continue();
                            }
                            else
                            {
                                try{
                                    transaction.abort();
                                }catch(e){
                                    boildb.global.console.debug(e);
                                }
                            }
                        }
                    };
                }
            });
        }

        this.AddList = function (storeName, list) {
            return new Promise(function(resolve, reject){
                if(!storeName || !list){
                    reject('storename,list cannot be empty');
                }else{
                    var _list = [];
                    if(!util.isArray(list)){
                        for(var i in list){
                            _list.push(list[i]);
                        }
                    }else{
                        _list = list;
                    }

                    var transaction = db.transaction([storeName], transactionType.READ_WRITE);
                    var count = 0;
                    transaction.oncomplete = function (event) {
                        boildb.global.console.debug(storeName+' Added ' + count + '/' + _list.length);
                        resolve([count, _list.length, true]);//final result
                    };
                    transaction.onabort = function(event) {
                        resolve([count, _list.length, true]);//final result
                    };
                    transaction.onerror = function(e) {reject(e);}

                    var store = transaction.objectStore(storeName);
                    if(_list.length == 0){
                        transaction.abort();
                        return;
                    }
                    putNext();
                    //not using foreach.
                    function putNext() {
                        if (count < _list.length) {
                            store.put(_list[count]).onsuccess = putNext;
                            ++count;
                            resolve([count, _list.length, false]);//for progress
                        } else {   // complete
                            boildb.global.console.debug('populate complete');
                        }
                    }
                }
            });
        };
        
        //new
        this.Count = function(storeName, operator, values){
            return new Promise(function(resolve, reject){
                if(!storeName){
                    reject('storename cannot be empty');
                }else{
                    var transaction = db.transaction([storeName], transactionType.READ_ONLY);
                    var obj = 0;
                    transaction.oncomplete = function(event) {
                        resolve(obj);
                    };
                    var objectStore = transaction.objectStore(storeName);
                    var request = !!operator ? 
                        objectStore.count(GetKeyRange(operator, values)) :
                        objectStore.count() ;
                    request.onerror = function(e) { reject(e);}
                    request.onsuccess = function(event) {
                        obj = request.result;
                    };
                }
            });
        }
        
        //new
        this.IndexCount = function(storeName, indexName, operator, values){
            return new Promise(function(resolve, reject){
                if(!storeName || !indexName){
                    reject('storename, indexName cannot be empty');
                }else{
                    var transaction = db.transaction([storeName], transactionType.READ_ONLY);
                    var obj = 0;
                    transaction.oncomplete = function(event) {
                        resolve(obj);
                    };
                    var objectStore = transaction.objectStore(storeName);
                    var index = objectStore.index(indexName); 
                    var request = !!operator ? 
                        index.count(GetKeyRange(operator, values)) :
                        index.count();

                    request.onerror = function(e) { reject(e);}
                    request.onsuccess = function(event) {
                        obj = request.result;
                    };
                }
            });
        }

        //new, only chrome 45.0 has support
        this.GetAll = function(storeName, operator, values, count){
            return new Promise(function(resolve, reject){
                if(!storeName || !key){
                    reject('storename or key cannot be empty');
                }else{
                    var transaction = db.transaction([storeName], transactionType.READ_ONLY);
                    var obj = null;
                    transaction.oncomplete = function(event) {
                        resolve(obj);
                    };

                    var objectStore = transaction.objectStore(storeName);
                    var request = null;
                    if(!operator && !count)
                    {
                        request = objectStore.getAll();
                    }
                    else if(!!operator && !count)
                    {
                        request = objectStore.getAll(GetKeyRange(operator, values));
                    }
                    else if(!operator && !!count)
                    {
                        request = objectStore.getAll(null, count);
                    }
                    else{
                        request = objectStore.getAll(GetKeyRange(operator, values), count);
                    }

                    request.onerror = function(e) { reject(e);}
                    request.onsuccess = function(event) {
                        obj = request.result;
                    };
                }
            });
        }

        //Uses openCursor, 
        this.GetKeyList = function(storeName, indexName, operator, values, orderbyDesc){
            return new Promise(function(resolve, reject){
                if(!storeName || !indexName){
                    reject('storename cannot be empty');
                }else{
                    var transaction = db.transaction([storeName], transactionType.READ_ONLY);
                    var list = [];
                    transaction.oncomplete = function(event) {
                        resolve(list);
                    };
                    transaction.onerror =  function(e) { reject(e);}
                    var objectStore = transaction.objectStore(storeName);
                    var cursorRequest = null;
                    if(indexName)
                    {
                        var Index = store.index(indexName);
                        cursorRequest = orderbyDesc ? 
                            Index.openCursor(GetKeyRange(operator, values), cursorType.PREV) : 
                            Index.openCursor(GetKeyRange(operator, values));
                    }
                    else
                    {
                        cursorRequest = orderbyDesc ? store.openCursor(null, cursorType.PREV) : store.openCursor();
                    }

                    cursorRequest.onsuccess = function(ev) {
                        var cursor = cursorRequest.result || ev.target.result;
                        if(!!cursor == false)
                            return;

                        list.push(cursor.key);
                        cursor.continue();
                    };
                }
            });
        }

        this.ExportDB = function(skipStores){
            return new Promise(function(resolve, reject){
                skipStores = skipStores || [];
                var storeList = db.objectStoreNames;
                var len = storeList.length - skipStores.length;
                var obj = {};
                var index = 0;
                for(var i=0;i<storeList.length;i++)
                {
                    if(skipStores.indexOf(storeList[i]) !== -1)//["listings","schedules"]
                    {
                        continue;
                    }
                    boildb.ListAll(storeList[i],null).then(function(list,storeName){
                        obj[storeName] = list;
                        index++;
                        if(index == len)
                        {
                            resolve(JSON.stringify(obj));
                        }
                    }).catch(function(err){
                        boildb.global.console.debug(err);
                        index++;
                        if(index == len)
                        {
                            resolve(JSON.stringify(obj));
                        }
                    });
                }

                if(len == 0)
                    resolve("");
            });
        };

        this.ImportDB = function(jsonString, skipStores){
            return new Promise(function(resolve, reject){
                skipStores = skipStores || [];
                var storeList = db.objectStoreNames;
                var len = storeList.length - skipStores.length;
                var obj = JSON.parse(jsonString);
                var index = 0;
                for(var i=0;i<storeList.length;i++)
                {
                    if(skipStores.indexOf(storeList[i]) !== -1)//["listings","schedules"]
                    {
                        continue;
                    }
                    boildb.AddList(storeList[i],obj[storeList[i]]).then(function(status){
                        if(status[2]){
                            index++;
                            if(index==len){
                                resolve([index,len]);
                            }
                        }
                    }).catch(function(err){
                        index++;
                        if(index==len){
                            resolve([index,len]);
                        }
                    });
                }

                if(len == 0)
                    resolve("");
            });
        };
    }
} (window, window.boildb = window.boildb || {} ));