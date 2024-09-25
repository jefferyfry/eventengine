/usr/bin/sh -c '/usr/bin/mongodump --archive --gzip --db eventengine | /usr/bin/aws s3 cp - s3://wizmongodbbackups/eventengine/eventengine-backup-file.agz --storage-c
lass STANDARD_IA --sse'