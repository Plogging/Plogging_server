#!/bin/bash

today=`date +%Y%m%d%H%M%S`

echo $(date '+%Y/%m/%d %H:%M:%S') $(docker exec -it dockercompose_plogging-redis_1 sh -c 'echo "auth dkwmfrjdns1!\nmulti\ndel score_weekly\ndel distance_weekly\ndel trash_weekly\nexec" | redis-cli' | tr '\r\n' ' ') >> /data/ploggingImgs/batchLog/weekly/flush_${today}.log 2>&1
