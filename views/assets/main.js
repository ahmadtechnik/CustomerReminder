var XLSX = require("xlsx");
var FS = require("fs");
var PATH = require("path");
var MD = require("md5");
var OPENURL = require("openurl");
var NETCONNECTION = require("internet-available");
var MAC = require("getmac");

// add new funciton To jQuery 
MAC.getMac(function (err, macAddress) {
    if (err) alert("COULD NOT GET MAC ADDRESS...");
    GM = macAddress;
});

$.eachSync = (obj, resu, end, start) => {
    start && start(obj);
    var objLength = Object.keys(obj).length;

    $.each(obj, (i, v) => {
        resu(i, v);
        objLength--;
        if (objLength <= 0) {
            if (end) {
                end(obj, i);
            }
        }
    });
}
//
$(document).ready(() => {
    //
    $(`.dropdown`).dropdown();
    //
    $(`#uploadeFileHiddenBtn`).change(onFileUploadedAction);
    //
    // $(`.sidebar`).sidebar("toggle");
    $('#uploadFileAccordion').accordion();
    //
    initStoredData();
    //
    $(document).keydown(onDocumentEvents.onKeydown);
    $(document).keyup(onDocumentEvents.onKeyup);
    $(document).keypress(onDocumentEvents.onPress);
    // setup static data for ajax
    $.ajaxSetup({
        url: "https://controller.ah-t.de/",
        type: "POST",
        beforeSend: (xhr) => {
            
        }
    });
});

var SELECT_CLASS = ["ui", "segment", "teal", "inverted", "basic"];
var HIDE_CSS_CLASS = {
    "display": "none",
};
var SHOW_CSS_CLASS = {
    "display": ""
};
var LOADING = ["ui", "segment", "loading"];
var FILEDATA = {};

function onFileUploadedAction() {
    var file = this.files[0];
    var thisBtn = this;

    // in case was the file not equals undefined
    if (file !== undefined) {
        switch (file.type) {
            case "application/vnd.ms-excel":
                $(`#uploadedFileName`).text(file.name);
                var fileReader = new FileReader();

                fileReader.onload = (F) => {
                    var array8bit = new Uint8Array(F.target.result);
                    var xlsxFile = XLSX.read(array8bit, {
                        type: "array"
                    }).Sheets;

                    /**
                     * make sure the file is only one sheet 
                     *  in case the file was larger than one sheet
                     *  it should to be handled in other way.
                     * in case also the file was not empty or does not have any sheet
                     */
                    if (Object.keys(xlsxFile).length <= 1 && Object.keys(xlsxFile).length > 0) {
                        var F = createOrOpenFile("staticData.json");
                        // each file's sheets
                        $.eachSync(xlsxFile, (index, sheet) => {
                            var jsonSheet = XLSX.utils.sheet_to_json(sheet, {
                                raw: false,
                                blankrows: true,
                            });

                            // check if this sheet exist in the file
                            var sheetName = MD(sheet["!ref"]);
                            var sheetHeader = Object.keys(jsonSheet[0]);

                            /** check if this sheet is created in static file before */
                            if (F[sheetName] === undefined) {
                                F[sheetName] = {}
                                writeNewDataToFile("staticData.json", F);
                            }
                            /** create row hash */
                            $.eachSync(jsonSheet, (i, row) => {
                                jsonSheet[i]["#hash"] = MD(Object.values(row).join("-"));
                            }, () => {
                                FILEDATA[sheetName] = jsonSheet;
                            });

                            /** create search fields as long as the header of the CSV file */
                            $.eachSync(sheetHeader, (i, e) => {
                                    /** 
                                     * in this block i am adding all avalible search fields
                                     * to make the user able to select search method totaly free
                                     *  */
                                    var fieldDiv = $(`<div class="field" by="${e}"></div>`);
                                    fieldDiv.css(HIDE_CSS_CLASS);
                                    var label = $(`<label>Search By : ${e}</label>`);
                                    var input = $(`<input type="text" placeholder="${e}" by="${e}" class="selectByToShow"/>`);
                                    /** add keydown Action for this input field */
                                    input.keydown(searchMethods.onKeyDownSearchField);
                                    input.keyup(searchMethods.onKeyUpSearchField);
                                    /** append the elements to field div */
                                    fieldDiv.append([label, input]);
                                    $(`#seatchFieldsContainer`).append(fieldDiv);
                                }, (sheetHeader) => {
                                    /** add the select menu of choosing the search method */
                                    var selectByToShow = $(`<select class="ui dropdown"></select>`);
                                    selectByToShow.append(`<option value="0">Please Select</option>`);
                                    $.eachSync(sheetHeader, (i, e) => {
                                        selectByToShow.append(`<option value="${e}">${e}</option>`);
                                    });
                                    var divField = $(`<div class="field"></div>`);
                                    divField.append([
                                        $(`<label>Select Column to search by</label>`),
                                        selectByToShow
                                    ]);
                                    $(`#seatchFieldsContainer`).append(divField);
                                    selectByToShow.dropdown({
                                        onChange: onSearchMethodSelector
                                    });
                                },
                                /** before start to add the new input fields to document */
                                (sheetHeader) => {
                                    $(`#seatchFieldsContainer`).html("")
                                })
                        }, (xlsxFile) => {
                            //$(`#sheetsContainer`).html();
                            $('#uploadFileAccordion').accordion("close", 0);
                        });
                        // end each the file's sheets
                        $(`body`).removeClass(LOADING);
                    };
                }
                fileReader.onprogress = (FileReader, ProgressEvent) => {

                };
                fileReader.onloadstart = () => {
                    $(`#sheetsContainer`).html("");
                    $(`body`).addClass(LOADING);
                    FILEDATA = {};
                }
                fileReader.readAsArrayBuffer(file);
                break;
        }

    } else {
        $(`#uploadedFileName`).text("No documents are listed for this customer.");
    }
    dateCellDetactor();
}

var searchMethods = {
    onKeyDownSearchField: (event) => {
        // user searching by
        var by = $(event.target).attr("by");
        var value = $(event.target).val().toLowerCase();
        var foundedRows = {};
        var F = createOrOpenFile("staticData.json");
        if (event.keyCode === 13) {
            if (value !== "") {
                var sheetHash
                $.eachSync(FILEDATA, (i, sheet) => {
                    sheetHash = i;
                    $.eachSync(sheet, (i, row) => {
                        if (row[by] !== undefined) {
                            if (typeof row[by] === "string") {
                                if (row[by].toLowerCase().includes(value)) {
                                    foundedRows[i] = row;
                                }
                            }
                        }
                    }, (sheet) => {});
                }, (FILEDATA) => {
                    /** each founded rows */
                    if (Object.keys(foundedRows).length < 50 && Object.keys(foundedRows).length > 0) {
                        var tableHeader = Object.keys(FILEDATA[Object.keys(FILEDATA)[0]][0]);
                        $(`#sheetsContainer`).html("");
                        // create new table
                        var tableE = $(`<table class="ui celled single line striped  table"></table>`);
                        var tableHead = $(`<thead></thead>`);
                        var trHead = $(`<tr></tr>`);
                        var tableBody = $(`<tbody></tbody>`);
                        /** each search table result header */
                        $.eachSync(tableHeader, (i, cell) => {
                                cell.charAt(0) !== "#" ? trHead.append(`<th>${cell}</th>`) : "";
                            }
                            // after finisheing add the header
                            , (tableHeader) => {
                                /** each result rows */
                                $.eachSync(foundedRows, (i, row) => {
                                    var addedBefore = F[sheetHash][row["#hash"]] === undefined ? false : true;

                                    var tableBodyRow =
                                        $(`<tr index="${i}" id="${foundedRows[i]["#hash"]}" rowClick="true" sheetHash="${sheetHash}"></tr>`);
                                    /** each row cells */
                                    var counter = 0;

                                    tableBody.append(tableBodyRow);
                                    addedBefore ? tableBodyRow.addClass("disabled") : "";
                                    $.eachSync(row, (i, cell) => {
                                        i.charAt(0) !== "#" ? tableBodyRow.append(`<td cell="${counter}">${cell}</td>`) : "";
                                        i.charAt(0) !== "#" ? counter++ : "";
                                    }, (row) => {
                                        tableHead.append(trHead);
                                        tableE.append([tableHead, tableBody]);
                                        $(`#sheetsContainer`).html(tableE);
                                        dateCellDetactor();
                                        /** add on click on the row  */
                                        $(`tr[rowClick='true']`).click(onCellClickAction);
                                    });
                                });
                            });

                        /** remove error color from element */
                        $(event.target).parent().removeClass("error");
                    } else if (Object.keys(foundedRows).length === 0) {
                        /** add error color to field eleemnt */
                        $(event.target).parent().addClass("error");
                        $(`#sheetsContainer`).html("");
                    } else {
                        /**  */
                        $(event.target).parent().removeClass("error");
                        $(`#sheetsContainer`).html("");
                    }
                });
            }
        }
    },
    onKeyUpSearchField: () => {

    }
}

/** 
 * 
 */
var CHOOSED_ROW_TABLE_ID = "";

function onCellClickAction(event) {
    var currentRow = this;
    var rowID = currentRow.getAttribute("id");
    var cellsInRow = $(currentRow).find("td");
    var tableHeader = cellsInRow.closest("table").find("thead").find("tr").find("th");
    CHOOSED_ROW_TABLE_ID = rowID;


    var rowData = [];
    rowData[0] = "<div class='ui center aligned icon header'>-Customers data-</div>";
    cellsInRow.each((i, e) => {
        var cellBGcolor = $(e).css("background-color");
        if ($(e).text() !== "") {
            var style = `style="background:${cellBGcolor}; color : white;"`;
            if (cellBGcolor !== "rgba(0, 0, 0, 0)") {
                style = `style="background:${cellBGcolor}; color : white;"`;
            } else {
                style = `style=""`;
            }
            var spanE = `<span class="boldFont">${$(e).text()}</span>`;
            var pE = `<p ${style} >` + $(tableHeader[i]).text() + " : " + spanE + "</p>";
            rowData.push(pE);
        }
    });

    $(`#dinamicModalHeader`).html(`<h1>VP-HASH : <span class="redWhite">${rowID}</span></h1>`);


    var gridPure = $(`<div class="ui two column grid stackable divided celled"></div>`);
    var gridRow = $(`<div class="row"></div>`);
    var leftSectionColumn = $(`<div class="column"></div>`);
    var rightSectionColumn = $(`<div class="column"></div>`);


    /** */
    leftSectionColumn.html(rowData);
    /**  */
    rightSectionColumn.html($(
        $(`<div class="ui form large" id="insertNewDataForm"></div>`)
        .append([
            $(`<div class="field" imp='true'></div>`)
            .append([`<label>Kundennummer<label>`, `<input type="text" id="customer_number"/>`]),
            $(`<div class="field" imp='true'></div>`)
            .append([`<label>Lieferdatum<label>`, `<input type="text" id="delivery_date" readonly="readonly" />`]),
            $(`<div class="field" imp='true'></div>`)
            .append([`<label>Laufzeit des vertrags <span class="redWhite">in Months</span><label>`, `<input type="text" id="contracts_term" />`]),
            $(`<div class="field" ></div>`)
            .append([`<label>e-mail address <span class="redWhite">if exist</span><label><label>`,
                `<input type="text" id="emailAddress" />`
            ]),
            $(`<div class="field"></div>`).append([`<label>hinweise<label>`, `<textarea rows="2" id="notes"></textarea>`])
            // append the upload btn 
            .append(`<div class="ui placeholder segment inverted secondary ">
            <div class="ui icon header">
              <i class="pdf file outline icon"></i>
              <span id="uploadedFileRowInfo">No documents are listed for this customer.</span>
            </div>
            <div class="ui primary button" onclick="$('#uploadAttachedElementsToRow').click()">Add Document</div>
            <input type="file" class="hidden" id="uploadAttachedElementsToRow" rowHash="${rowID}"/>
          </div>`)
        ])
    ));

    /** assign the grid left and right section to modal content */
    gridRow.html([leftSectionColumn, rightSectionColumn]);
    gridPure.html(gridRow);

    /** add modal actions buttons */
    var modalBtns = [
        `<div class="ui button cancel red">Close</div>`,
        `<div class="ui button ok green">Ok</div>`
    ];

    /** insert new elements to modal */
    $(`#dinamicModalAcitons`).html(modalBtns);
    $(`#dinamicModalContent`).html(gridPure);
    /** add modal properties */
    $(`#dinamicModal`).modal({
        closable: false,
        onVisible: onInsertDataModalShow,
        onApprove: onInsertDataModalOnApprove,
        onHidden: onInsertDataModalHidden
    }).modal("show");
    /** add action for upload attached files btn */
    $(`#uploadAttachedElementsToRow`).change(onUploadFileToRowAction);
}
/** 
 * on upload file btn change
 * in case the user uploaded file to user
 * it should be saved 
 *  */
var UPLOADEDFILE = null;
var onUploadFileToRowAction = (event) => {
    var file = event.target.files[0];
    if (file !== undefined) {
        UPLOADEDFILE = {};
        var fileName = file.name;
        var fileType = file.type;
        var fileSize = file.size;
        var rowID = $(event.target).attr("rowHash");
        UPLOADEDFILE["fileExtention"] = fileName.split(".").pop();
        UPLOADEDFILE["rowID"] = rowID;
        var uploadedFileData = `Name: ${fileName}<br>Type : ${fileType}<br>Size: ${(fileSize / 1024 ).toFixed(2)}KB`;
        $(`#uploadedFileRowInfo`).html(uploadedFileData);
        var v = new FileReader();
        var file = $(`#uploadAttachedElementsToRow`).get(0).files[0];
        console.log();
        v.onload = (f) => {
            UPLOADEDFILE["file"] = f.target.result;
        };
        v.readAsArrayBuffer(file);
    } else {
        UPLOADEDFILE["file"] = null;
        $(`#uploadedFileRowInfo`).html("No documents are listed for this customer.");
    }

}

/** */
function onInsertDataModalShow(modal) {
    $("#delivery_date").datepicker({
        dateFormat: 'dd/mm/yy'
    });
    $(`#dinamicModal`).modal("refresh");
}
/** */
function onInsertDataModalHidden(modal) {
    /** clear modal after close */
    $(`#dinamicModalHeader`).html(``);
    $(`#dinamicModalAcitons`).html("");
    $(`#dinamicModalContent`).html("");
    $("#delivery_date").datepicker("destroy");
    UPLOADEDFILE = null;
}
/** */
function onInsertDataModalOnApprove(modal) {
    var customer_number = $(`#customer_number`).val();
    var delivery_date = $("#delivery_date").datepicker().val();
    var contracts_term = $(`#contracts_term`).val();
    var emailAddress = $(`#emailAddress`).val();
    var notes = $(`#notes`).val();
    if (customer_number === "" || delivery_date === "" || contracts_term === "") {
        var fields = $(`#customer_number`).closest(".ui.form").find("[imp='true']");
        fields.each((i, e) => {
            $(e).find("input").val() !== undefined && $(e).find("input").val() === "" ? $(e).addClass("error") : $(e).removeClass("error");
        });
        return false;
    } else {
        var oldDataStored = createOrOpenFile("staticData.json");

        /** push the new values to row  */
        var sheetname = $(`#${CHOOSED_ROW_TABLE_ID}`).attr("sheetHash");
        var indexNum = $(`#${CHOOSED_ROW_TABLE_ID}`).attr("index");

        var rowToAdd = FILEDATA[sheetname][indexNum];


        // in case the sheet name was not exist in the table
        if (oldDataStored[sheetname] !== undefined) {

            rowToAdd["Kundennummer"] = customer_number;
            rowToAdd["Lieferdatum"] = delivery_date;
            rowToAdd["Vertragslaufzeit"] = contracts_term;
            rowToAdd["Email"] = emailAddress;
            rowToAdd["Notiz"] = notes;
            /** add flag that this row have file */
            if (UPLOADEDFILE !== null) rowToAdd["#file"] = UPLOADEDFILE.fileExtention;

            // in case the row was not exist in the sheet object
            if (oldDataStored[sheetname][CHOOSED_ROW_TABLE_ID] === undefined) {
                oldDataStored[sheetname][CHOOSED_ROW_TABLE_ID] = rowToAdd;

                $(`.sheetsContainer #${CHOOSED_ROW_TABLE_ID}`).addClass("disabled");
                writeNewDataToFile("staticData.json", oldDataStored);
                console.log("New Row Added to sheet object");

            } else {
                // ask user if he would like to update the old data
                console.log("THIS ROW IS  EXIST IN STATIC FILE");
            }
        } else {
            /**
             * i have to ask user if he want to update the same existed data
             */
            console.log("SHEET NAME IS NOT DEFINED IN STATIC FILE");
        }
        /**
         *  check if the file to row was uploaded or 
         *  there any file has the same name as the row hash 
         * */
        if (UPLOADEDFILE !== null) {
            var fileReader = new FileReader();
            var file = $(`#uploadAttachedElementsToRow`).get(0).files[0];
            fileReader.readAsArrayBuffer(file);
            /** */
            fileReader.onload = (f) => {
                /** check if the storage dir exist or not */
                FS.existsSync(PATH.join(__dirname, "..", "storage")) ? "" : FS.mkdirSync(PATH.join(__dirname, "..", "storage"));
                FS.writeFile(PATH.join(__dirname, "..", "storage", UPLOADEDFILE.rowID + "." + UPLOADEDFILE.fileExtention),
                    new Uint16Array(UPLOADEDFILE["file"]), (err) => {
                        if (!err) {
                            UPLOADEDFILE = null;
                        };
                    });
            }
        }
        initStoredData();
        return true;
    }

}

/** */
function createOrOpenFile(fileName) {
    var path = PATH.join(__dirname, "..", fileName);
    var fileExist = FS.existsSync(path);
    // in case was the json file exist
    if (fileExist) {
        return JSON.parse(FS.readFileSync(path, {
            encoding: "UTF-8"
        }));
    } else {
        // in case the file was not exist i have to create it again
        FS.writeFileSync(path, JSON.stringify({}), "UTF-8");
        createOrOpenFile(fileName);
    }
}

/** write new data to file */
function writeNewDataToFile(fileName, data) {
    var path = PATH.join(__dirname, "..", fileName);
    if (typeof data === "object") {
        FS.writeFileSync(path, JSON.stringify(data), {
            encoding: "UTF-8"
        });
    } else if (typeof data === "string") {
        FS.writeFileSync(path, data, {
            encoding: "UTF-8"
        });
    }
}

/** init the existed Data in table on app starts or page refreshed */
var STATICFILEROWS = [];

function initStoredData() {
    $(`#oldDataStoredInStaticFile`).html("");
    var F = createOrOpenFile("staticData.json");
    var counter = 0;

    // each all sheets in static file
    $.eachSync(F, (i, sheet) => {
        var sheetName = i;
        var table = $(`<table class="ui single line table striped " id="${sheetName}"></table>`);
        var tableHead = $(`<thead></thead>`);
        var tableBody = $(`<tbody></tbody>`);

        STATICFILEROWS.push(sheet);

        var containData = false;
        var headerOfCurrentSheetAdded = false;

        // each current sheet
        if (Object.keys(sheet).length >= 1) {

            containData = true;
            /** each static file rows */
            $.eachSync(sheet, (i, row) => {
                /** draw header of this sheet */
                var rowHeader = Object.keys(row);
                /** */
                if (!headerOfCurrentSheetAdded) {
                    var emptyTableRow = $(`<tr id="${sheetName}"></tr>`);
                    $.eachSync(rowHeader, (i, v) => {
                        if (v.charAt(0) !== "#") {
                            emptyTableRow.append(`<th cell="${v}" >${v}</th>`);
                        }
                    }, (rowHeader) => {
                        headerOfCurrentSheetAdded = true;

                    });
                    tableHead.append(emptyTableRow);
                    headerOfCurrentSheetAdded = true;
                }


                /** in case the header of secoundery table was drawed */
                var emptyTableRow = $(`<tr class="" id="${i}" sheetName="${sheetName}" ></tr>`);

                /**
                 * each rows which are not table body
                 * to get each single cell
                 */
                $.eachSync(row, (i, v) => {
                    /** 
                     * it does not have to show some field to user 
                     * such as any field which has # sign at first char
                     *  */
                    if (i.charAt(0) !== "#") {
                        var datesPoints = v.match(regularEx.datesPoints);
                        if (datesPoints) {
                            /** replace the point with slash */
                            v.replace(/[.]/g, "/");
                        }
                        emptyTableRow.append(`<td hCell="${i}" cell="${i}" >${v}</td>`);
                    }
                }, (row) => {
                    /** 
                     * in case the current row have a file or not
                     */
                    if (row['#file']) {
                        var linkToFile = PATH.join(__dirname, "..", "storage", row["#hash"] + "." + row["#file"]);
                        var linkToFileBtn = $(`<a ><i class="file pdf loading icon"></i></a>`);

                        /** add click action to a btn */
                        linkToFileBtn.click((event) => {
                            OPENURL.open("file://" + linkToFile);
                        });
                        var newTEXT = emptyTableRow.find("td[cell='Auftr.-Nr.']").text();
                        emptyTableRow.find("td[cell='Auftr.-Nr.']").html([newTEXT, linkToFileBtn]);
                    }
                });
                /** set click event to every row */
                emptyTableRow.click(secounderyTableRowClick);
                tableBody.append(emptyTableRow);
            }, (sheet) => {
                table.append([tableHead, tableBody]);
                $(`#oldDataStoredInStaticFile`).append(table);
            });
        }
        if (containData) {
            table.append([tableHead, tableBody]);
            $(`#oldDataStoredInStaticFile`).append(table);
        }
        counter++;

    }, (obj) => {

        /** in case the each loop finished it starts to emplimant other functions */
        dateCellDetactor();
    });
}



/** add popup to row free HTML code */
function addPopupContent(row) {
    return false;
    var sheetName = $(row).attr("sheetName");
    $(row).popup({
        html: $(getCellNamesAsHTML()),
        inline: true,
        hoverable: true,
        transition: "zoom",
        delay: {
            show: 500,
            hide: 100
        },
        setFluidWidth: true,
    });

    function getCellNamesAsHTML() {
        var HTML = $(`<div class="ui segment inverted orange"></div>`);
        $(row).find("td").each((i, v) => {
            var h = $(v).attr("hCell") !== undefined ? $(v).attr("hCell") + " : " : ""
            var d = `<span class="blackWhite">${$(v).text()}</span>`;
            var line = $("<span calss='noPadding'>" + h + d + "</span>")
            HTML.append([line, "<br>"]);
        });
        return HTML;
    }
}

function dateCellDetactor() {
    var allCells = $(`[cell]`);
    var thisYear = new Date().getFullYear();
    var length = allCells.length;
    allCells.each((i, e) => {
        if ($(e).text().match(regularEx.dates) || $(e).text().match(regularEx.datesPoints)) {

            /** repace the sign in between the numbers to one modal */
            var replacedDate = $(e).text().replace(/[-\.-\//]/g, "-");
            var dateObject = new Date(replacedDate);

            var fixDate = replacedDate.split("-");
            // in case the year was only 2 digit
            if (dateObject.getFullYear()) {
                /** to add tow digit to first of the year */
                fixDate.forEach((v, i) => {
                    fixDate[i] = parseInt(v);

                });
                // in case was the date date of birth.
                if (fixDate[2] < 100) {
                    // in case was date of birth
                    if (fixDate[2] >= parseInt(thisYear.toString().substr(-2))) {
                        fixDate[2] = parseInt("19" + fixDate[2]);
                    }
                    // in case was date after 2000
                    else {
                        fixDate[2] = parseInt("20" + fixDate[2]);
                    }
                }
                $(e).text(fixDate.join("-"));
                replacedDate = fixDate.join("-");

            } else {
                fixDate.forEach((v, i) => {
                    fixDate[i] = parseInt(v);
                });
                $(e).text(fixDate.join("-"));
                replacedDate = fixDate.join("-")
            }
            var split = replacedDate.toString().split("-");
            var finalDate = new Date();
            finalDate.setFullYear(split[2]);
            finalDate.setMonth(split[1]);
            finalDate.setDate(split[0]);
            finalDate.setHours("00");
            finalDate.setMinutes("00");
            finalDate.setSeconds("00");

            var DateToday = new Date();
            var Difrant = Date.parse(DateToday) - finalDate;
            var diffDays = Math.floor(Difrant / (1000 * 60 * 60 * 24));
            var diffMonthes = Math.floor(Difrant / (1000 * 60 * 60 * 24 * 30));
            var diffYears = Math.floor(Difrant / (1000 * 60 * 60 * 24 * 365.25));

            $(e).css({
                background: "#ff9966",
                color: "white"
            });
            // re set the cell with new date
            $(e).text(replacedDate);
            $(e).attr("DO", true);
        }
        /** after finishing the each loop */
        if (length === i + 1) {

            compairTheDate();
        }
    });
}


/** to compair the rows */
function compairTheDate() {
    /** start to compair dates */
    var D = "Lieferdatum";
    var E = "Vertragslaufzeit";
    var F = "Geburtsdatum";
    var dateToday = new Date();
    var contracts_termColumn = $(`#oldDataStoredInStaticFile td[cell="${E}"]`);
    var delivery_dateColumn = $(`#oldDataStoredInStaticFile td[cell="${D}"]`);
    var order_numberColumn = $(`td[cell="${F}"]`);
    /** start append the new column to the parent table */
    var parentTable = $(contracts_termColumn).closest("table");
    if (parentTable.find("thead").find("tr").find("[cell='IMP']").length < 1) {
        parentTable.find("thead").find("tr").prepend("<th class='importantHeader' cell='IMP'>IMP</th>");
    }
    // each all cell which contain date
    if (delivery_dateColumn.length >= 1) {
        $.eachSync(delivery_dateColumn, (i, D) => {
            var rowID = $(D).parent().attr("id");
            var checkIfCellExist = $(`#oldDataStoredInStaticFile #${rowID}`).find(`td[hCell='IMP']`);
            /** in case was the cell which contain the leaft time on */
            if (checkIfCellExist.length < 1) {

                var delivery_date = $(D).text().split("-");
                var day = parseInt(delivery_date[0]);
                var month = parseInt(delivery_date[1]);
                var year = parseInt(delivery_date[2]);
                var dToDateObject = new Date(year + "-" + month + "-" + day);

                var contracts_term = contracts_termColumn[i].textContent;
                // diffrance days in MS
                var contracts_termInMS = (contracts_term * 30) * (1000 * 60 * 60 * 24);
                var contracts_termInDay = (contracts_term * 30);
                var contracts_termInDMonth = contracts_term;

                var DA = Date.parse(dateToday) + contracts_termInMS;
                var leaft = DA - Date.parse(dateToday);

                // Date between term and 
                var DBTaDD = Math.floor((Date.parse(dateToday) - Date.parse(dToDateObject)) / (1000 * 60 * 60 * 24));

                var leaftD = (leaft / (1000 * 60 * 60 * 24)) - DBTaDD;
                var leaftM = leaft / (1000 * 60 * 60 * 24 * 30);
                // in case the contract is not starts yet
                if (DBTaDD < 0) {
                    var td = $(`<td hCell="IMP" >${Math.abs(DBTaDD)} T</td>`);
                    $(`#oldDataStoredInStaticFile #${rowID}`).prepend(td);
                } else {
                    var td = $(`<td hCell="IMP">${leaftD} D</td>`);
                    $(`#oldDataStoredInStaticFile #${rowID}`).prepend(td);
                }
                // to detect soon finishing term of any cotract
                if (leaftD > 90 && leaftD <= 180) {
                    td.addClass("WORN");
                } else if (leaftD < 90 && leaftD > 0) {
                    td.addClass("DENG");
                    td.transition('set looping').transition('pulse', '500ms');
                } else if (leaftD > 180) {
                    td.addClass("POSITIVE");
                } else if (leaftD < 0) {
                    td.text(`${Math.abs(leaftD)} D ago`);
                    td.addClass("DENGL2");
                    td.transition('set looping').transition('pulse', '500ms');
                }

                addPopupContent($(`#${rowID}`));
            } else {
                /** in case the column of IMP data is exist or not */
            }
        }, (delivery_dateColumn) => {});
    }
    var MONTHES = [];
    /** detect Date of birth of costumer */
    $.eachSync(order_numberColumn, (i, cell) => {
        var dateOfBirth = $(cell).text();
        // date of Birth of costomer DAY , MONTH , YEAR
        var day = parseInt(dateOfBirth.split("-")[0]);
        var month = parseInt(dateOfBirth.split("-")[1]);
        var year = dateOfBirth.split("-")[2];
        var dateMS = Date.parse(month + "-" + day + "-" + year);
        // date today DAY , MONTH , YEAR
        var dayToday = new Date().getDate();
        var monthToday = new Date().getMonth() + 1;
        var yearToday = new Date().getFullYear();
        var todayMS = Date.parse(new Date());
        // 
        var customerAge = Math.floor((todayMS - dateMS) / (1000 * 60 * 60 * 24 * 365.25));
        if (day === dayToday && month === monthToday) { //
            var cakeIcon = $(`<a>${customerAge + 1 } <i class="birthday cake icon"></i></a>`);
            $(cell).html([
                cakeIcon,
                dateOfBirth
            ]);
        }

    });
}


/** the static file table row click action */
var SELECTEDROW = null;

function secounderyTableRowClick(event) {
    var F = createOrOpenFile("staticData.json");
    var currentRow = $(this);
    /** in case the user wanted to remove row from Table */
    if (event.altKey && event.ctrlKey) {
        var F = createOrOpenFile("staticData.json");
        var sheetName = $($(currentRow).closest("table").get(0)).attr("id");
        var rowID = $(currentRow).attr("id");
        F[sheetName][$(currentRow).attr("id")];

        // check if this row has file attached.
        // then remove the file
        F[sheetName][rowID]["#file"] !== undefined ?
            // remove the binded file 
            FS.unlink(PATH.join(__dirname, "..", "storage", rowID + "." + F[sheetName][rowID]["#file"]), (err) => {
                if (err) alert("ERROR : " + err);
            }) :
            "";

        delete F[sheetName][rowID];
        writeNewDataToFile("staticData.json", F);
        // i have to remove this object from file
        $(currentRow).transition({
            animation: 'horizontal flip',
            onComplete: () => {
                $(currentRow).remove();
                $(`#uploadeFileHiddenBtn`).change();
            }
        });
        /** to check if  the current sheet have any more rows */
        if (Object.keys(F[sheetName]).length === 0) {
            delete F[sheetName];
            writeNewDataToFile("staticData.json", F);
            $($(currentRow).closest("table").get(0)).transition({
                animation: 'horizontal flip',
                onComplete: () => {
                    $($(currentRow).closest("table").get(0)).remove();
                    $(`#uploadeFileHiddenBtn`).change();
                }
            })
        }
        $(`#newDataToRows`).html("");
    }
    /** in case user does not press both alt keys */
    else {
        /** each every cell */
        var rowID = currentRow.attr("id")
        var sheetName = currentRow.attr("sheetname");
        var rowData = F[sheetName][rowID];
        var previewDataContainer = $(`#newDataToRows`);
        SELECTEDROW = rowData;
        var paragraphContainer = $(`<div class="ui segment orange"></div>`);
        var leftDays = currentRow.find("td[hcell='IMP']");
        /** each row data to post it into segment */
        var bgColor = "background-color : " + leftDays.css("background-color") + " ;";
        /**
         * 
         */
        paragraphContainer
            .append($(`<h1 class="ui centered header" style="${bgColor}">${leftDays.text()}</h1><div class="ui clearing divider"></div>`));
        /**
         * 
         */
        var list = $(`<div class="ui middle aligned list"></div>`);
        /** each row cells to print them as a list */
        $.eachSync(rowData, (i, cell) => {
            if (i.charAt(0) === "#") return false;
            var listItem = $(`<a class="item spical"></a>`);
            var itemIcon = $(`<i class="hand point right icon"></i>`);
            var listContent = $(`<div class="content"></div>`);
            var listHeader = $(`<div class="header">${i}</div>`);
            var listDisc = $(`<div class="description"> ----> <span class="boldFont">${cell}</span></div>`);
            /** to add mark for every spical list item */
            switch (i) {
                case "Telefonnummer":
                    listItem.click(listActions.sendSMS);
                    break;
                case "Anschrift":
                    listItem.click(listActions.sendLetter);
                    break;
                case "Kundennummer":
                    listItem.click(listActions.costumerNumber);
                    break;
                default:
                    listItem.removeClass("spical");
                    break;
            }

            listContent.html([listHeader, listDisc]);
            listItem.html([itemIcon, listContent]);
            list.append(listItem);
        }, (rowData) => {
            paragraphContainer.append(list);
            /** append the accessoires of the row data */
            previewDataContainer.html([
                paragraphContainer,
            ]);
            $(`.spical`).transition('horizontal flip in')
        });
    }
};
/** actions to list of row data showed */
var listActions = {
    sendSMS: (event) => {
        $("#responseReciverContainer").load(PATH.join(__dirname, "modals", "sendSMS.html"));
    },
    sendLetter: (event) => {

    },
    costumerNumber: (event) => {

    }
}


/** age range > 6570 && < 36500 Days*/
/** Contracts term range 1095 . Alarm Range  */
var regularEx = {
    MobileWithCountryCode: /^([\+]?)([0-9]{1,4}?)[.\s-]?([0-9]{3,5}?)[.\s-]?([0-9]{4,10}?)$/i,
    PhoneNumberWithoutCode: "",
    EmailAddress: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/igm,
    dates: /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
    datesPoints: /^\d{1,2}[-\.-\//]\d{1,2}[-\.-\//]\d{4}$/,
}

function onSearchMethodSelector(item) {
    $(`div[by]`).find("input").val("");
    $(`div[by]`).removeClass("error")
    $(`div[by]`).css(HIDE_CSS_CLASS);
    $(`div[by='${item}']`).css(SHOW_CSS_CLASS);
}
/** whole document actions  */
var KEYPRESSEDONDOCOMENT = null;
var PRESSMSCOUNTER = 0;
var onDocumentEvents = {
    onKeydown: (event) => {
        KEYPRESSEDONDOCOMENT = event.keyCode;
        PRESSMSCOUNTER++;
        if (KEYPRESSEDONDOCOMENT === 122 || KEYPRESSEDONDOCOMENT === 91) return false;
    },
    onKeyup: (event) => {
        KEYPRESSEDONDOCOMENT = null;
        PRESSMSCOUNTER = 0;
    },
    onPress: () => {

    }
};

/**
 * TO ADD
 * - Kundennummer
 * - Lieferdatum
 * - Laufzeit des vertrags
 * - hinweise
 */