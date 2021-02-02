module.exports = {
    // 마지막 페이지 수 구하기
    calcLastPage: function(allItems, itemCntPerPage) {
        if (allItems % itemCntPerPage === 0) return allItems / itemCntPerPage;
        else return Math.floor(allItems / itemCntPerPage) + 1;
    }
}