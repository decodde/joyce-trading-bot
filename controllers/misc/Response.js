const Response={
    success:(message,data)=>{
        data?data=data:data="empty";
        var ret={
            type:"success",
            msg:message,
            data:data
        }
        return ret;
    },
    error:(message,errors)=>{
        errors?errors=errors:errors=[];
        var ret={
            type:"error",
            msg:message,
            errors:errors
        }
        return ret;
    }
}

exports.Response=Response;