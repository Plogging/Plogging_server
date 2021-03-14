#!/bin/sh

branchName=$1
echo ${branchName}

if [ "${branchName}" = "develop" ]; then
	echo "develop"
elif [ "${branchName}" = "production" ]; then
	echo "production"
else
	echo "please check branchName"
fi
