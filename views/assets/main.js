var XLSX = require("xlsx");

//
$(document).ready(() => {
    //
    $(`#uploadeFileHiddenBtn`).change(onFileUploadedAction);
    //
    $(`.sidebar`).sidebar("toggle");
});

function onFileUploadedAction(event) {
    var file = this.files[0];
    if (file !== undefined) {
        $(`#uploadedFileName`).text(file.name);
        var fileReader = new FileReader();
        fileReader.onload = (F) => {
            var file = new Uint8Array(F.target.result);

            var xlsxFile = XLSX.read(file, {
                type: "array"
            }).Sheets;

            $.each(xlsxFile, (index, sheet) => {
                var jsonSheet = XLSX.utils.sheet_to_json(sheet);

                if (jsonSheet.length > 0) {
                    var html = XLSX.utils.sheet_to_html(sheet, {
                        editable: false,
                    });
                    // get table from HTML
                    var table = $($(html)[2]);

                    // create new table
                    var tableE = $(`<table class="ui fixed table"></table>`);
                    var tableHead = $(`<thead></thead>`);
                    var tableBody = $(`<tbody></thead>`);

                    // get first row of the table
                    var tableHeader = table.find("tbody").find("tr")[0];
                    /** replace the td with th to make the first row as header */
                    var ColumnsIndexes = {};
                    $(tableHeader).find("td").each((i, v) => {
                        $(v).replaceWith(`<th>${v.textContent}</th>`);
                        ColumnsIndexes[i] = $(v).text();
                    });

                    // append all rows without header
                    table.find("tbody").find("tr").each((index, row) => {
                        if (index !== 0 && $(row).children().length > 0) {
                            tableBody.append(row);
                        } else {

                        }
                        /** detect if row is empty */

                        var rowDR = $(row).find("td");
                        var rowDRDS = $(row).find("[t='z']");

                        if (rowDR.length === rowDRDS.length) {
                            row.remove()
                        } else {
                            /** set row id from index num 1 */
                            if ($(row).find("td")[1].textContent !== "") {
                                $(row).attr("id", $(row).find("td")[1].textContent);
                            }
                        }



                        /** detect all emails and phone numbers/Emails */
                        if ($(row).children().length > 0 && index !== 0) {

                            var children = $(row).children();
                            /** each row cell */
                            children.each((index, chiled) => {
                                /** check number mach */
                                var machPhone = chiled.textContent.match(regularEx.MobileWithCountryCode);
                                var machEmail = chiled.textContent.match(regularEx.EmailAddress);
                                var machDate = chiled.textContent.match(regularEx.dates);
                                /** detect Phone Number */
                                if (machPhone) {
                                    $(chiled).attr("action", "sendSMS");
                                    $(chiled).attr("number", chiled.textContent);
                                    $(chiled).addClass(["positive", "cursor"]);
                                }
                                /** start detect Email address */
                                if (machEmail) {
                                    $(chiled).append("<br><a class='item'>Email</a>");
                                    $(chiled).addClass("warning");
                                    $(chiled).addClass(["positive", "cursor"]);
                                }
                                /** detect all dates in the table */
                                if (machDate) {
                                    var DataInTable = Date.parse(chiled.textContent);
                                    var DateToday = new Date();
                                    var Difrant = Date.parse(DateToday) - DataInTable;
                                    var diffDays = Math.floor(Difrant / (1000 * 60 * 60 * 24));
                                    var diffYears = Math.floor(Difrant / (1000 * 60 * 60 * 24 * 365.25));
                                    var diffMonthes = Math.floor(Difrant / (1000 * 60 * 60 * 24 * 30));
                                    
                                    /** select spacific Cell index */
                                    if (index === 3) {
                                        /** make sure the date is not an Age */
                                        if (diffMonthes < 216) {
                                            /** this date is not an age and expired */
                                            $(chiled).css({
                                                background: "blue",
                                                color: "white"
                                            });
                                            /** add since attrbute to row */
                                            $(chiled).parent().attr("since", diffDays);
                                        };
                                        /** add class to make this elemnt corsur */
                                        $(chiled).addClass("cursor");
                                        /** add on click event to this cell */
                                        $(chiled).click((event) => {
                                            $.ajax({
                                                url: "https://controller.ah-t.de/",
                                                method: "POST",
                                                data: {
                                                    "DATE": $(chiled).parent().attr("id")
                                                },
                                                success: (resp) => {
                                                    console.log(resp)
                                                }
                                            });
                                        });
                                    }
                                }
                                /** add action to first cell in the table */
                                if (index === 0 && chiled.textContent !== "") {
                                    $(chiled).addClass(["costumerModalShow", "firstCell"]);
                                    /** add cell click event */
                                    $(chiled).click((event) => {
                                        var currentRow = event.target.parentElement;

                                    });
                                }
                            });

                        }
                    });

                    tableHead.append(tableHeader);
                    tableE.append(tableHead);
                    tableE.append(tableBody);

                    $(`#sheetsContainer`).append(tableE);
                }
            })
        };
        fileReader.readAsArrayBuffer(file);
        //var read = XLSX.read(file);
        //console.log(read);
    }
}


var regularEx = {
    MobileWithCountryCode: /^([\+]?)([0-9]{1,4}?)[.\s-]?([0-9]{4}?)[.\s-]?([0-9]{7}?)$/i,
    PhoneNumberWithoutCode: "",
    EmailAddress: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/igm,
    dates: /^\d{1,2}\/\d{1,2}\/\d{2,4}$/
}