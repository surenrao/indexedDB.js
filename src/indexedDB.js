//Author: Surya Nyayapati
//Date: 2014-03-21
//Version: 1.0.0
(function (environment, boildb, undefined) {
    "use strict";
    
    var indexedDB = environment.indexedDB || environment.mozIndexedDB || environment.webkitIndexedDB || environment.msIndexedDB;
    if(!indexedDB)
    {
        throw new Error("Current browser does not suppport indexedDB.");   
    }
    
     // (Mozilla has never prefixed these objects, so we don't need environment.mozIDB*) and opera has become webkit based
    var IDBTransaction = environment.IDBTransaction || environment.webkitIDBTransaction || environment.msIDBTransaction;
    var IDBKeyRange = environment.IDBKeyRange || environment.webkitIDBKeyRange || environment.msIDBKeyRange;
    var IDBCursor = environment.IDBCursor || environment.webkitIDBCursor || environment.msIDBCursor;

    var TransactionType = { READ_ONLY: "readonly", READ_WRITE: "readwrite" }
    var CursorType = { NEXT: "next", NEXT_NO_DUPLICATE: "nextunique", PREV: "prev", PREV_NO_DUPLICATE:"prevunique"}
    
    var util = {};
    
    util.isArray = function(obj){
        if (Array.isArray)
            return Array.isArray(obj);
        else
            return Object.prototype.toString.call( obj ) === '[object Array]';
    }
    
    //schema structure
    //    {
    //        "dbName"   :"testDB",
    //        "version"  :1,
    //        //contains all final stores for new users
    //        "stores"   :[{
    //                        "name"         :"storeName1",
    //                        "primaryField" :"",
    //                        "autoIncrement":false,
    //                        "indexes"      :[{
    //                            "name":"",
    //                            "field":"",
    //                            "unique":false,
    //                            "multiEntry":false//can index a field which is an array(i.e. can do tags)
    //                        }]
    //                    }],
    //        "seedData": {"storeName1":[]},
    //        //contains revisions for existing user
    //        "revisions":[{
    //            "version":1,
    //            "stores":[],
    //            "seedData": {"storeName1":[]},
    //        }],
    //    };
    boildb.schema = null;
    
    boildb._db = null;
    boildb._version = null;
    boildb._dbName = null;
    
    boildb.GetKeyRange = function(operator, values) {
        //console.log('GetKeyRange',operator, values);
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
    
    boildb.Open = function () {
        return new Promise(function(resolve,reject){
            if(!boildb.schema){
                reject('schema is not defined');
            }
            var dbOpenRequest = indexedDB.open(boildb.schema.dbName, boildb.schema.version);
            dbOpenRequest.onerror = function(err) {
                reject(err);
            }
            dbOpenRequest.onblocked = function (event) {
                //alert("Please close all other tabs with this page open!");
                reject(event);
            };
            dbOpenRequest.onsuccess = function(event) {
                boildb._db = event.target.result;
                boildb._version = boildb.schema.version;
                boildb._dbName = boildb.schema.dbName;
                resolve(0);
                console.log('indexedDB.Open() success!', event);
            };
            dbOpenRequest.onupgradeneeded = function (event) {
                console.log("onupgradeneeded!: ", event);
                boildb._db = event.target.result;
                var oldVersion = event.oldVersion;
                var newVersion = event.newVersion;
                var transaction = dbOpenRequest.transaction;//VERSION_CHANGE mode
                
                if (oldVersion == 0) {//new user create everything
                    boildb.schema.stores.forEach(function(store, index, strArray){
                        boildb.DropObjectStore(store.name).then(function(deleted){
                            console.log('onupgradeneeded deleted', store);
                            return boildb.CreateObjectStore(store);
                        }).then(function(created){
                            console.log('onupgradeneeded created',created);
                        }).catch(function(err){
                            console.log('onupgradeneeded err',err);
                        });
                    });
                }else{
                    //todo
                }
                transaction.oncomplete = function(event) {
                    console.log('indexedDB.Open() complete! ',event);
                    resolve(1);
                    //do data init
                    //boildb.schema.InitData(event.oldVersion, callback);
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
                };
            }
        });
    }
    
    boildb.GetDB = function(){
        return new Promise(function(resolve,reject){
            if(!!boildb._db) {
                resolve(boildb._db);
            }else{
                boildb.Open().then(function(status){
                    resolve(boildb._db);
                }).catch(function(err){
                    reject(err);
                });
            }
        });
    }

    boildb.Close = function(){
        return new Promise(function(resolve, reject){
            boildb.GetDB().then(function(db){
                db.close();
                boildb._db = null;
                resolve(true);
            }).catch(function(err){
                reject(err);
            });
        });
    }
	
    boildb.DeleteDatabase = function(dbName){
		console.log('DeleteDatabase ', dbName || boildb._dbName);
		return new Promise(function(resolve, reject){
            boildb.Close().then(function(status){
                var deleteReq = indexedDB.deleteDatabase(dbName || boildb._dbName);
                deleteReq.onsuccess = function(){
                    console.log("Database deleted");
                    resolve(true);
                };
                deleteReq.onblocked = function (e) {
                  //alert("database blocked. Please close all tabs");
                  console.log("db Blocked!: ", e);
                  reject(false, e);
                };
                deleteReq.onerror = function(e){
                    //alert("Could not delete database. Database may not exist");
                    reject(false, e);
                };
            });
        });
    }
    
    boildb.DropObjectStore = function (storeName) {
        return new Promise(function(resolve, reject){
            boildb.GetDB().then(function(db){
                if (db.objectStoreNames.contains(storeName)) {
                    db.deleteObjectStore(storeName);
                    console.log('objectstore ' + storeName + ' dropped');
                    resolve(true);
                }else{
                    console.log("Doesnt exist! cannot delete ObjectStore ",storeName);
                    resolve(false);
                }
            }).catch(function(err){
                console.log("db is null! cannot delete ObjectStore ",storeName);
                reject(err);
            });
        });
    }
    
    boildb.CreateObjectStore = function (storeSchema) {
        console.log(storeSchema);
        return new Promise(function(resolve, reject){
            boildb.GetDB().then(function(db){
                var strParam = {};
                if(!!storeSchema.primaryField)
                    strParam.keyPath = storeSchema.primaryField;
                
                strParam.autoIncrement = (storeSchema.autoIncrement !== undefined) ? storeSchema.autoIncrement : false;
                
                var store = db.createObjectStore(storeSchema.name, strParam);
                if(!!storeSchema.indexes){
                    for(var i=0;i<storeSchema.indexes.length;i++){
                        var idxParam = {};
                        idxParam.unique = (storeSchema.indexes[i].unique !== undefined) ? idxParam.unique : false;
                        idxParam.multiEntry = (storeSchema.indexes[i].multiEntry !== undefined) ? idxParam.multiEntry : false;

                        store.createIndex(storeSchema.indexes[i].name, storeSchema.indexes[i].field, idxParam);
                    }
                }
                
                resolve(store);    
            }).catch(function(err){
                console.log("db is null! cannot create ObjectStore ",storeSchema.name);
                reject(err);
            });
        });
    }
    
    boildb.ClearObjectStore = function(storeName){
        return new Promise(function(resolve, reject){
            boildb.GetDB().then(function(db){
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
                    console.log("Doesnt exist! cannot clear ObjectStore ",storeName);
                    reject(false);
                }
            }).catch(function(err){
                console.log("db is null! cannot clear ObjectStore ",storeName);
                reject(err);
            });
        });
    }

    boildb.ClearAllStores = function(skipStores){
        skipStores = skipStores || [];
        return new Promise(function(resolve, reject){
            boildb.GetDB().then(function(db){
                var storeList = db.objectStoreNames;
                console.log(storeList);

                var len = storeList.length - skipStores.length;
                var count = 0;
                for(var i=0;i<storeList.length;i++)
                {
                    if(skipStores.indexOf(storeList[i]) !== -1)//["listings","schedules"]
                    {
                        continue;
                    }
                    boildb.ClearAll(storeList[i],function(cleared){
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
            }).catch(function(err){
                console.log("db is null! cannot ClearAllStores ");
                reject(err);
            });
        });
    }

    boildb.Delete = function(storeName, key){
        return new Promise(function(resolve, reject){
            if(!storeName || !key){
                reject('storename or key cannot be empty');
            }else{
                boildb.GetDB().then(function(db){
                    var request = db.transaction(storeName, transactionType.READ_WRITE)
                            .objectStore(storeName)
                            .delete(key);
                    request.onsuccess = function(event) {
                        resolve(true);
                    };
                    request.onerror = function(event) {
                        reject(event);
                    };
                }).catch(function(err){
                    console.log("db is null! cannot Delete ");
                    reject(err);
                });
            }
        });
    }
    //Uses cursor
    boildb.DeleteRange = function(storeName, indexName, operator, values){  
        return new Promise(function(resolve, reject){
            if(!storeName || !indexName || !operator || !values){
                reject('storeName, indexName, operator, values cannot be empty');
            }else{
                boildb.GetDB().then(function(db){
                    var transaction = db.transaction([storeName], transactionType.READ_WRITE);
                    transaction.oncomplete = function(event) {
                        resolve(true);
                    };
                    transaction.onerror = function(e) {reject(e);}
                    var store = transaction.objectStore(storeName);

                    var Index = store.index(indexName);
                    var cursorRequest = Index.openCursor(boildb.GetKeyRange(operator, values));
                    cursorRequest.onsuccess = function(ev) {
                        var cursor = cursorRequest.result;
                        if (cursor) {
                            cursor.delete();
                            cursor.continue();
                        }
                    };
                }).catch(function(err){
                    console.log("db is null! cannot DeleteRange ");
                    reject(err);
                });
            }
        });
    }
    
    boildb.GetObj = function(storeName, key){
        return new Promise(function(resolve, reject){
            if(!storeName || !key){
                reject('storename or key cannot be empty');
            }else{
                boildb.GetDB().then(function(db){
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
                }).catch(function(err){
                    console.log("db is null! cannot GetObj ");
                    reject(err);
                });
            }
        });
    }
    
    boildb.SetObj = function(storeName, obj){
        return new Promise(function(resolve, reject){
            if(!storeName || !obj){
                reject('storename or obj cannot be empty');
            }else{
                boildb.GetDB().then(function(db){
                    var transaction = db.transaction([storeName], transactionType.READ_WRITE);

                    var store = transaction.objectStore(storeName);
                    var request = store.put(obj);
                    request.onerror = function(e) { reject(e);}
                    request.onsuccess = function(event) {
                        resolve(true);
                    };
                }).catch(function(err){
                    console.log("db is null! cannot SetObj ");
                    reject(err);
                });
            }
        });
    }
    //Uses cursor
    boildb.ListAll = function(storeName, keyPath){
        keyPath = keyPath || false; 
        return new Promise(function(resolve, reject){
            if(!storeName){
                reject('storename cannot be empty');
            }else{
                boildb.GetDB().then(function(db){
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
                }).catch(function(err){
                    console.log("db is null! cannot ListAll ");
                    reject(err);
                });
            }
        });
    }
    
    //Uses cursor, if indexName is null then will search on whole objectStore
    boildb.FindObjList = function(storeName, indexName, operator, values, orderbyDesc){
        return new Promise(function(resolve, reject){
            if(!storeName || !operator || !values){
                reject('storename, operator, values cannot be empty');
            }else{
                boildb.GetDB().then(function(db){
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
                            Index.openCursor(boildb.GetKeyRange(operator, values), cursorType.PREV) : 
                            Index.openCursor(boildb.GetKeyRange(operator, values));
                    }
                    else
                    {
                        cursorRequest = orderbyDesc ? 
                            store.openCursor(boildb.GetKeyRange(operator, values), cursorType.PREV) : 
                            store.openCursor(boildb.GetKeyRange(operator, values));
                    }

                    cursorRequest.onsuccess = function(ev) {
                      var cursor = cursorRequest.result;
                      if (cursor) {
                        resultset.push(cursor.value);
                        //console.log(cursor.value);
                        cursor.continue();
                      }
                    };
                }).catch(function(err){
                    console.log("db is null! cannot FindObjList ");
                    reject(err);
                });
            }
        });
    }  
    
    //Uses openCursor, if indexName is null then will search on whole objectStore
    boildb.FindObjListLimit = function(storeName, indexName, operator, values, orderbyDesc, limit){
        return new Promise(function(resolve, reject){
            if(!storeName || !operator || !values){
                reject('storename, operator, values cannot be empty');
            }else{
                boildb.GetDB().then(function(db){
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
                            Index.openCursor(boildb.GetKeyRange(operator, values), cursorType.PREV) : 
                            Index.openCursor(boildb.GetKeyRange(operator, values));
                    }
                    else
                    {
                        cursorRequest = orderbyDesc ? 
                            store.openCursor(boildb.GetKeyRange(operator, values), cursorType.PREV) : 
                            store.openCursor(boildb.GetKeyRange(operator, values));
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
                }).catch(function(err){
                    console.log("db is null! cannot FindObjListLimit ");
                    reject(err);
                });
            }
        });
    }
     
    boildb.AddList = function (storeName, list) {
        return new Promise(function(resolve, reject){
            if(!storeName || !list){
                reject('storename,list cannot be empty');
            }else{
                boildb.GetDB().then(function(db){
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
                        console.log(storeName+' Added ' + count + '/' + _list.length);
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
                            console.log('populate complete');
                        }
                    }
                }).catch(function(err){
                    console.log("db is null! cannot AddList ");
                    reject(err);
                });
            }
        });
    };
    //new
    boildb.Count = function(storeName, operator, values){
        return new Promise(function(resolve, reject){
            if(!storeName){
                reject('storename cannot be empty');
            }else{
                boildb.GetDB().then(function(db){
                    var transaction = db.transaction([storeName], transactionType.READ_ONLY);
                    var obj = 0;
                    transaction.oncomplete = function(event) {
                        resolve(obj);
                    };
                    var objectStore = transaction.objectStore(storeName);
                    var request = !!operator ? 
                        objectStore.count(boildb.GetKeyRange(operator, values)) :
                        objectStore.count() ;
                    request.onerror = function(e) { reject(e);}
                    request.onsuccess = function(event) {
                        obj = request.result;
                    };
                }).catch(function(err){
                    console.log("db is null! cannot GetObj ");
                    reject(err);
                });
            }
        });
    }
    //new
    boildb.IndexCount = function(storeName, indexName, operator, values){
        return new Promise(function(resolve, reject){
            if(!storeName || !indexName){
                reject('storename, indexName cannot be empty');
            }else{
                boildb.GetDB().then(function(db){
                    var transaction = db.transaction([storeName], transactionType.READ_ONLY);
                    var obj = 0;
                    transaction.oncomplete = function(event) {
                        resolve(obj);
                    };
                    var objectStore = transaction.objectStore(storeName);
                    var index = objectStore.index(indexName); 
                    var request = !!operator ? 
                        index.count(boildb.GetKeyRange(operator, values)) :
                        index.count();
                    
                    request.onerror = function(e) { reject(e);}
                    request.onsuccess = function(event) {
                        obj = request.result;
                    };
                }).catch(function(err){
                    console.log("db is null! cannot GetObj ");
                    reject(err);
                });
            }
        });
    }
    
    //new, only chrome 45.0 has support
    boildb.GetAll = function(storeName, operator, values, count){
        return new Promise(function(resolve, reject){
            if(!storeName || !key){
                reject('storename or key cannot be empty');
            }else{
                boildb.GetDB().then(function(db){
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
                        request = objectStore.getAll(boildb.GetKeyRange(operator, values));
                    }
                    else if(!operator && !!count)
                    {
                        request = objectStore.getAll(null, count);
                    }
                    else{
                        request = objectStore.getAll(boildb.GetKeyRange(operator, values), count);
                    }
                    
                    request.onerror = function(e) { reject(e);}
                    request.onsuccess = function(event) {
                        obj = request.result;
                    };
                }).catch(function(err){
                    console.log("db is null! cannot GetObj ");
                    reject(err);
                });
            }
        });
    }
    
    //Uses openCursor, 
    boildb.GetKeyList = function(storeName, indexName, operator, values, orderbyDesc){
        return new Promise(function(resolve, reject){
            if(!storeName || !indexName){
                reject('storename cannot be empty');
            }else{
                boildb.GetDB().then(function(db){
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
                            Index.openCursor(boildb.GetKeyRange(operator, values), cursorType.PREV) : 
                            Index.openCursor(boildb.GetKeyRange(operator, values));
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
                }).catch(function(err){
                    console.log("db is null! cannot GetObj ");
                    reject(err);
                });
            }
        });
    }
    
    boildb.ExportDB = function(skipStores){
        return new Promise(function(resolve, reject){
            skipStores = skipStores || [];
            boildb.GetDB().then(function(db){
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
                        console.log(err);
                        index++;
                        if(index == len)
                        {
                            resolve(JSON.stringify(obj));
                        }
                    });
                }
                
                if(len == 0)
                    resolve("");
            }).catch(function(err){
                console.log("db is null! cannot ListAll ");
                reject(err);
            });
        });
    };

    boildb.ImportDB = function(jsonString, skipStores){
        return new Promise(function(resolve, reject){
            skipStores = skipStores || [];
            boildb.GetDB().then(function(db){
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
                
            }).catch(function(err){
                console.log("db is null! cannot ListAll ");
                reject(err);
            });
        });
    };

} (window, window.boildb = window.boildb || {} ));