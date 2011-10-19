var _GoldPlugin_layer;
var _intervalPreventTimeOut;
var _intervalGetHistory;
var _intervalReadyToGo;
var _intervalConfirm;
var _level = 0;
var _status = 0;		//0：初始化；1：买；2：卖
var _priceDiff = 0;		//买卖的差价 
var _baseBuy = 0;
var _baseSell = 0;
var _TopPrice = 0;			//高位价格
var _BottomPrice = 0;		//低位价格
var _BottomPriceBack = 0;	//前回低位价格
var _sellBtm = 0;
var _sellTop = 0;
var _buyBtm = 0;
var _buyTop = 0;
var _cntBuy = 0;		//涨的回数
var _cntSell = 0;
var _isBuyOnly = false;	//只买不卖
var _boughtList = new Array();		//买入列表
var _boughtNode;		//买入节点
var _isBuying = false;	//是否买入
var _dealPrice = 0;		//交易金额
var _dealTime;			//交易时间
var _isHalf = false;	//交易数量是否已折半
var _xmlhttp;
var _areaCode = "";
var _dseSessionId = "";
var _dsePageId = "";
var _fluctuations = new Array();	//分析实时报价的语料

function _GoldPluginInit()
{
    var agt = navigator.userAgent.toLowerCase();
    var h = '';
    h += '<div id="_GoldPlugin" style="overflow:auto; width: 220px; height: 260px;">';
    h += ' <form id="_book" onsubmit="return false;">V1.86';
    h += '    买入数量：<input id="_txtMount" type="text" size="5" value="100">';
    h += '    <br />';
    h += '    <input id="_btnAutoStart" onclick="_Init();_AutoStart();" type="submit" value="开始">';
    h += '    <input id="_btnStopAll" onclick="_StopAll();" type="button" value="停止">';
	h += '    <input id="_btnForceBuy" onclick="_ForceBuy();" type="button" value="买入">';
    h += '    <input id="_btnForceSell" onclick="_ForceSell();" type="button" value="卖出">';
	h += '    <br />';
	h += '    <input id="_btnClearLog" onclick="_ClearLog();" type="button" value="清空">';
    h += '    <input id="_btnReadDetails" onclick="_ReadDetails();" type="button" value="明细">';
	h += '    <input id="_chkBuyOnly" onclick="_BuyOnly(this.checked);" type="checkbox">'
	h += '		<label for="_chkBuyOnly">只买</label>';
	h += '    <input id="_chkShowTestArea" onclick="_ShowTestArea(this.checked);" type="checkbox">';
	h += '		<label for="_chkShowTestArea">测试</label>';
    h += '    <br />';
	h += '    <div id="_testArea" style="display:none">';
    h += '		<input id="_btnTest" onclick="_Test();" type="button" value="测试"><br />';
	h += '		<textarea id="_txtTest" rows="3" cols="20">_ShowMsg("测试");</textarea>';
	h += '    </div>';
    h += '    <div id="_xmlHttpStatus"></div>';
    h += '    <div id="_msg"></div>';
    h += '    <div id="_debug"></div>';
	h += '    <div id="_log"></div>';
	h += ' </form>';
    h += '</div>';
    try
    {
        var el = document.createElement('div');
        el.id = '_GoldPlugin_layer';
        el.style.position = 'absolute';
        el.style.left = document.documentElement.scrollLeft + 3 + 'px';
		var scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
        el.style.top = document.documentElement.scrollTop + scrollHeight - 260 - 15 + 'px';
        el.style.zIndex = 9000;
        el.style.border = '1px solid #808080';
        el.style.backgroundColor='#F8F0E5';

        document.body.appendChild(el);
        _GoldPluginSet(el, h);
        //window.onscroll = function()
        //{
            //document.getElementById("_GoldPlugin_layer").style.left = document.documentElement.scrollLeft + 3 + 'px';
            //document.getElementById("_GoldPlugin_layer").style.top = document.documentElement.scrollTop + 30 + 'px';
        //};
    }
    catch(x)
    {
        alert("Crack can not support this page.\n" + x);
        _GoldPlugin_layer = true;
        return;
    }

	_GoldPlugin_layer = document.getElementById('_GoldPlugin_layer');
}

function _ShowTestArea(isShow)
{
	var testArea = document.getElementById('_testArea');
	if (isShow == true)
	{
		testArea.style.display = 'inline';
	}
	else
	{
		testArea.style.display = 'none';
	}
}

function _BuyOnly(isBuyOnly)
{
	if (isBuyOnly == true)
	{
		_isBuyOnly = true;
	}
	else
	{
		_isBuyOnly = false;
	}
}

//强行买入
function _ForceBuy()
{
	_StopAll();
	_AutoStart();
	_Buy(-1);
}

//强行卖出
function _ForceSell()
{
	_StopAll();
	_AutoStart();
	_Sell(-1);
}

function _Test()
{
	try
	{
		var str = document.getElementById('_txtTest').value;
		eval(str);
	}
	catch (e)
	{
		_ShowMsg(_Now() + e.message);
	}
}

//读取交易明细
function _ReadDetails()
{
	try
	{
		var form = frames['mainFrame'].GoldForm;
		if (form)
		{
			var url = "/servlet/ICBCINBSReqServlet";
			var prams = "dse_sessionId=" + form.dse_sessionId.value;
			prams += "&dse_applicationId=-1";
			prams += "&dse_operationName=per_GoldQueryDetailOp";
			prams += "&dse_pageId=" + form.dse_pageId.value;
			prams += "&Flag=1";
			prams += "&styFlag=0";
			prams += "&flag1=2";
			_getXmlHttp(url, prams, _GetDetails, true);
		}
		else
		{
			_ShowMsg("请点击“查询交易明细”链接");
		}
	}
	catch (e)
	{
		_ShowMsg(_Now() + e.message);
	}
}

function _GetDetails(xmlhttp)
{
	try
	{
		if (xmlhttp.responseText.indexOf("错误页面") >= 0)
		{
			_ShowMsg("请点击“查询”按钮");
			return;
		}
		var str = GB2UTF8(xmlhttp.responseBody);
		profit = _Round(_SetBoughtList(str));
		str="";
		for(var i = 0; i < _boughtList.length; i++)
		{
			str += _boughtList[i].price + " ";
		}
		_ShowMsg("查询完毕<br>剩余" + _boughtList.length + "笔尚未卖出。<br>" + str + "<br>盈亏：" + profit +"元");
	}
	catch (e)
	{
		_ShowMsg(_Now() + e.message);
	}
}

function _SetBoughtList(str)
{
	var arr = str.split("\n");
	var pattern = /(\d{4}-\d{2}-\d{2}\s+?\d{2}:\d{2}:\d{2}).*?(买入|卖出).*?(人民币账户白银)\s+?(\d+\.\d+)\s+?(\d+\.\d+)/ig;
	var time;
	var buyOrSell;
	var price;
	var mount;
	var profit = 0;

	_boughtList = [];
	for (var i = 0; i < arr.length; i++)
	{
		if (arr[i].indexOf("人民币账户白银") > 0)
		{
			//RegExp.$1	"2011-06-02  21:38:02"
			//RegExp.$2	"买入"
			//RegExp.$3	"人民币账户白银"
			//RegExp.$4	"7.74"
			//RegExp.$5	"100.00"
			arr[i].match(pattern);
			time = RegExp.$1;
			buyOrSell = RegExp.$2;
			price = RegExp.$4;
			mount = RegExp.$5;
			time = new Date(Date.parse(time.replace(/-/g, "/"))).getTime();
			price = parseFloat(price.replace(",", ""));
			mount = parseFloat(mount.replace(",", ""));
			if (buyOrSell.indexOf("买入") >= 0)	//买入
			{
				_boughtNode = {
							"time":time,
							"price":price,
							"mount":mount
						};
				_boughtList.push(_boughtNode);
				_boughtList.sort(_sortList);
			}
			else	//卖出
			{
				while (mount > 0 && _boughtList.length > 0)
				{
					//卖出数量大于等于单笔买入数量
					if (mount >= _boughtList[0].mount)
					{
						mount = mount - _boughtList[0].mount;
						profit += _Round( _boughtList[0].mount * ( price - _boughtList[0].price ) );
						_boughtList.splice(0, 1);	//删除首元素
					}
					else	//卖出数量小于单笔买入数量
					{
						profit += _Round( mount * ( price - _boughtList[0].price ) );
						_boughtList[0].mount -= mount;
						mount = -1;
					}
				}
			}
		}
	}
	_SetCookie();
	return profit;
}

function _GetRealtime()
{
	try
	{
		var url = "/servlet/com.icbc.by.datastruct.servlet.AsynGetDataServlet";
		var prams = "step=3";
		prams += "&area_code=" + _areaCode;
		prams += "&submitFlag=1";
		prams += "&SessionId=" + _dseSessionId;
		prams += "&tranCode=A00033";
		_getXmlHttp(url, prams, _ReadyToGo);
	}
	catch (e)
	{
		_ShowMsg(_Now() + e.message);
	}

}

function _ReadyToGo(str)
{
	var obj;
	var buy;
	var sell;
	var upOrDown;
	var i = 0;

	try
	{
		obj = JSON.parse(str);
		for(i = 0; i < obj.market.length; i++)
		{
			if(obj.market[i].currcode == "903")	//针对白银，以后会增加选择
			{
				buy = obj.market[i].sellprice;
				sell = obj.market[i].buyprice;
				upOrDown = obj.market[i].upordown;
				break;
			}
		}

		if (_status == 0)	//初始化
		{
			_priceDiff = _Round( buy - sell );
		}
		else if (_status == 1)	//买
		{
			_ReadyToGo_Buy(buy, upOrDown);
		}
		else if (_status == 2)	//卖
		{
			_ReadyToGo_Sell(sell, upOrDown);
		}
		else
		{
			_ShowDebug(_Now() + "_status未赋值");
			_priceDiff = _Round( buy - sell );
			_status = 0;
		}
	}
	catch (e)
	{
		_ShowMsg(_Now() + e.message);
	}
}

function _ReadyToGo_Buy(buy, upOrDown)
{
	if ( _baseBuy == 0 )
	{
		_baseBuy = buy;
		_buyBtm = buy;
		_buyTop = buy;
	}

	if ( buy >= _buyTop )
	{
		_buyTop = buy;
		_buyBtm = buy;
	}

	if ( buy < _buyBtm )
	{
		_buyBtm = buy;
	}

	_ShowMsg("实时买入价："+buy+"<br>高："+_buyTop+" 低："+_buyBtm+"<br>即将买入，请勿点击任何链接");

	//当前价格小于前回最小值
	if ( buy < _BottomPriceBack )
	{
		//取消交易
		_StopAll();
		_AutoStart();
	}

	if ( _baseBuy < _buyTop )
	{
		_StopAll();
		_AutoStart();
		_Buy(buy);
	}
	else
	{
		if ( ( buy - _buyBtm ) >= ( _priceDiff / 2 ) )
		{
			_StopAll();
			_AutoStart();
			_Buy(buy);
		}
	}
}

function _ReadyToGo_Sell(sell, upOrDown)
{
	if ( _baseSell == 0)
	{
		_baseSell = sell;
		_sellBtm = sell;
		_sellTop = sell;
	}

	if (sell >= _sellTop)
	{
		_sellTop = sell;
		_sellBtm = sell;
	}

	if (sell < _sellBtm)
	{
		_sellBtm = sell;
	}

	_ShowMsg("实时卖出价："+sell+"<br>高："+_sellTop+" 低："+_sellBtm+"<br>即将卖出，请勿点击任何链接");

	if ( _baseSell > _sellBtm )
	{
		_StopAll();
		_AutoStart();
		_Sell(sell);
	}
	else
	{
		if ( ( _sellTop - _sellBtm ) >= ( _priceDiff / 2 )
		  && ( sell <= _sellBtm ) )
		{
			_StopAll();
			_AutoStart();
			_Sell(sell);
		}
	}
}

//按价格排序
function _sortList(a, b)
{
	return a.price - b.price;
}

function _Sell(price)
{
	var time = new Date();
	var buyPrice;	//买入价

	try
	{
		if (_boughtList.length > 0)
		{
			_boughtList.sort(_sortList);
			buyPrice = _boughtList[0].price;	//最低价格
			if ( buyPrice < price || price == -1)
			{
				frames['mainFrame'].frames['_left'].translink('1','903');
				frames['mainFrame'].frames['_right'].InfoForm.goldAmount.value = _boughtList[0].mount;
				frames['mainFrame'].frames['_right'].form_submit();
				_intervalConfirm = setInterval(_Confirm, 500);	//0.5秒钟
				_ShowMsg(_Now() + " 正在卖出");
			}
		}
		else
		{
			_ShowMsg("没有买入记录，请点击“明细”按钮查询");
		}
	}
	catch (e)
	{
		_ShowMsg(_Now() + e.message);
	}

}

function _Buy(price)
{
	try
	{
		var mount = document.getElementById("_txtMount").value;
		frames['mainFrame'].frames['_left'].translink('0','903');
		frames['mainFrame'].frames['_right'].InfoForm.goldAmount.value = mount;
		frames['mainFrame'].frames['_right'].form_submit();
		_intervalConfirm = setInterval(_Confirm, 500);	//0.5秒钟
		_ShowMsg(_Now() + " 正在买入");
	}
	catch (e)
	{
		_ShowMsg(_Now() + e.message);
	}
}

function _Confirm()
{
	try
	{
		var frame = frames['mainFrame'].frames['_right'];
		var url;
		var time;
		var strStart;
		var strEnd;
		var doc;
		var mount;

		//页面尚未加载完毕
		if ( ( frame.document.readyState != "loaded" )
		  && ( frame.document.readyState != "interactive" )
		  && ( frame.document.readyState != "complete" ) )
		{
			//等待
			_ShowMsg(_Now() + " 等待页面加载");
		}
		//留在首页，尚未切换
		else if (frame.document.title.indexOf("交易首页") >= 0)
		{
			//等待
			_ShowMsg(_Now() + " 等待显示确认页面");
		}
		//确认页面
		else if ( frame.document.title.indexOf("即时买卖确定页") >= 0 )
		{
			//交互状态（页面已经加载完毕）
			if ( typeof frame.redundance != "undefined" )
			{
				if ( ( frame.redundance == false )
				  && ( typeof frame.document.documentElement.innerText != "undefined" )
				  && ( typeof frame.document.InfoForm != "undefined" )
				  && ( typeof frame.document.InfoForm.cashnote != "undefined" )
				  && ( typeof frame.document.InfoForm.AmtforLog != "undefined" )
				  && ( typeof frame.document.InfoForm.clock != "undefined" ) )
				{
					doc = frame.document.documentElement.innerText.replace(",", "");
					strStart = doc.indexOf("交易金额：");
					strEnd = doc.indexOf("大写金额：");
					var price = parseFloat(doc.substring(strStart + 5, strEnd));
					time = new Date();

					//买入
					if (frame.document.InfoForm.cashnote.value == "M045")
					{
						mount = parseFloat(frame.document.InfoForm.AmtforLog.value);
						_boughtNode = {
							"time":time,
							"price":_Round( price / mount ),
							"mount":mount
						};
						_isBuying = true;
						_dealPrice = _Round( price / mount );
						_dealTime = time;
						frame.isqueryed();
						_ShowMsg(_Now() + " 等待显示买入结果页面");
					}
					//卖出
					else if (frame.document.InfoForm.cashnote.value == "M046")
					{
						mount = parseFloat(frame.document.InfoForm.AmtforLog.value);
						_boughtNode = null;
						_isBuying = false;
						_dealPrice = _Round( price / mount );
						_dealTime = time;
						frame.isqueryed();
						_ShowMsg(_Now() + " 等待显示卖出结果页面");
					}
					else
					{
						_dealTime = time;
						_SetLog( _Now() + " 出现异常" );
					}

					if (frame.document.InfoForm.clock.value.indexOf("00:00") >= 0)
					{
						clearInterval(_intervalConfirm);
						_SetLog( _Now() + " 超时" );
						url = "/servlet/ICBCINBSCenterServlet?id=160101&dse_sessionId=";
						url += _dseSessionId;
						frames['mainFrame'].location.href = url;
					}
				}
			}
		}
		//成功交易
		else if ( frame.document.title.indexOf("即时买卖结果页") >= 0 )
		{
			clearInterval(_intervalConfirm);
			//买入
			if (_isBuying == true)
			{
				_SetLog( _Now(_dealTime) + " 买入：" + _dealPrice );
				_boughtList.push(_boughtNode);
				_boughtList.sort(_sortList);
				_SetCookie();
			}
			//卖出
			else
			{
				_SetLog( _Now(_dealTime) + " 卖出：" + _dealPrice );
				_boughtList.splice(0, 1);	//删除首元素
				_boughtList.sort(_sortList);
				_SetCookie();
			}
			url = "/servlet/ICBCINBSCenterServlet?id=160101&dse_sessionId=";
			url += _dseSessionId;
			frames['mainFrame'].location.href = url;
		}
		//交易失败
		else if ( frame.document.title.indexOf("错误页面") >= 0 )
		{
			clearInterval(_intervalConfirm);
			strStart = "提示信息:";
			doc = frame.document.documentElement.innerText;
			var errMsg = _Now() + " 交易失败:<br>";
			if (doc.indexOf(strStart) >= 0)
			{
				errMsg += doc.substr(doc.indexOf(strStart) + 6);
			}
			else
			{
				errMsg += frame.document.title;
			}
			_SetLog( errMsg );
			url = "/servlet/ICBCINBSCenterServlet?id=160101&dse_sessionId=";
			url += _dseSessionId;
			frames['mainFrame'].location.href = url;
		}
		//未知错误，等待
		else
		{
			_ShowMsg( _Now() + " 无法查询状态" );
		}
	}
	catch (e)
	{
		clearInterval(_intervalConfirm);
		url = "/servlet/ICBCINBSCenterServlet?id=160101&dse_sessionId=";
		url += _dseSessionId;
		frames['mainFrame'].location.href = url;
		_SetLog(_Now() + e.message);
	}
}

function _SetCookie()
{
	var str = JSON.stringify(_boughtList);
	Cookie.write("boughtList", str, {duration: 360});
}

function _GetCookie()
{
	var str = Cookie.read("boughtList");
	return JSON.parse(str);
}

//获取实时历史数据
function _GetHistory_realtime()
{
	try
	{
		var form = frames['mainFrame'].frames['_left'].picform;
		_dsePageId = form.dse_pageId.value;

		var prams = "dse_sessionId=" + _dseSessionId;
		prams += "&dse_applicationId=-1";
		prams += "&dse_operationName=per_GoldQueryPriceOp";
		prams += "&dse_pageId=" + _dsePageId;
		prams += "&step=1";
		prams += "&goldType=rmb_903";	//针对纸白银，以后会增加选择
		prams += "&kType=realtime";
		prams += "&pageType=big";
		prams += "&curtype=903";		//针对纸白银，以后会增加选择
		prams += "&acflag=1";
		prams += "&area_code=" + _areaCode;
		prams += "&submitFlag=1";

		var url = "/servlet/ICBCINBSReqServlet";

		_getXmlHttp(url, prams, _AnalyzeData_realtime);		
	}
	catch (e)
	{
		var prams = "dse_sessionId=" + _dseSessionId;
		prams += "&dse_applicationId=-1";
		prams += "&dse_operationName=per_GoldQueryPriceOp";
		prams += "&dse_pageId=" + _dsePageId;
		prams += "&step=1";
		prams += "&goldType=rmb_903";	//针对纸白银，以后会增加选择
		prams += "&kType=realtime";
		prams += "&pageType=big";
		prams += "&curtype=903";		//针对纸白银，以后会增加选择
		prams += "&acflag=1";
		prams += "&area_code=" + _areaCode;
		prams += "&submitFlag=1";

		var url = "/servlet/ICBCINBSReqServlet";

		_getXmlHttp(url, prams, _AnalyzeData_realtime);
		//_ShowMsg(_Now() + e.message);
	}
}

//分析实时数据
function _AnalyzeData_realtime(str)
{
	var strStart = "var oilprices";
	var strEnd = "document.getElementById('maxprice')";
	var strOilprices = str.substring( str.indexOf(strStart), str.indexOf(strEnd) );

	try
	{
		eval(strOilprices);
		if (_level == 1 || _level == 2)	//查询历史实时报价
		{
			_AnalyzeData_level1(oilprices);
		}
		else
		{
			_ShowDebug(_Now() + "_level未赋值");
			_level = 1;		//默认值
			_AnalyzeData_level1(oilprices);
		}
	}
	catch (e)
	{
		_ShowMsg(_Now() + e.message);
		_SetLog(_Now() + e.message + " 可能已退出，请重新登录");
		//_StopAll();
	}

}

function _AnalyzeData_level1(oilprices)
{
	var price = 0;				//当前价格
	var limit = _priceDiff * 2;	//两倍差价
	var i = 0;
	var totalPrice = 0;
	var average = 0;
	var max = 0;
	var bottom = 0;

	try
	{
		_fluctuations = [];

		for(i = 0; i < oilprices.length; i++)
		{
			price = oilprices[i][1];
			if (price >= _TopPrice)
			{
				_TopPrice = price;		//涨，设置top
				_BottomPrice = price;
				_BottomPriceBack = price;
			}
			if (price < _BottomPrice)
			{
				_BottomPrice = price;	//跌，设置bottom
				_BottomPriceBack = price;
			}
			if (max < price)
			{
				max = price;
			}

			if ( ( _Round( _TopPrice - _BottomPrice ) > limit )
			  && ( _Round( _TopPrice - _BottomPrice ) > _Round( price / 100 ) ) )
			{
				_fluctuations.push(-1);	//添加语料，跌
				if ( _Round( price - _BottomPrice ) >= _Round( ( _TopPrice - _BottomPrice ) / 3 ) )
				{
					bottom = _BottomPrice;
					_BottomPriceBack = _BottomPrice;
					_TopPrice = price;
					_BottomPrice = price;
					_fluctuations.push(0);	//添加语料，平
				}
			}
			else
			{
				_fluctuations.push(0);	//添加语料，平
			}
			totalPrice += price;
		}
		if (oilprices.length > 0)
		{
			average = _Round(totalPrice / oilprices.length);
		}

		var obj = _GetPH(price - _priceDiff / 2);
		_ShowDebug("高："+_TopPrice+" 低："+_BottomPrice+" 现："+price+"<br>浮动盈亏："+obj.ph+"<br>平均买入价："+obj.avg+"<br>买入数量："+obj.mount);

		//如果跌，进入15秒历史实时报价查询
		var element = _fluctuations.pop();
		if ( element == -1 )
		{
			if (_level == 1)
			{
				if (_NotEnoughMoney(price + _priceDiff))
				{
					_ShowMsg(_Now() + " 无法查询余额或余额不足，无法买入");
				}
				else
				{
					_level = 2;	//15秒历史实时报价状态
					clearInterval(_intervalGetHistory);
					_intervalGetHistory = setInterval(_GetHistory_realtime, 16000);	//15秒
					_ShowMsg("发现下跌，等待买入");
				}
			}
		}
		else
		{
			if (_level == 2)
			{
				element = _fluctuations.pop();
				if ( element == -1 )
				{
					//谷底和最大值的差在2.5%之内
					if ( _Round( max - bottom ) < _Round( price * 2.5 / 100 ) )
					{
						_level = 3;		//5秒查询当前报价
						_status = 1;	//买
						clearInterval(_intervalGetHistory);
						_intervalReadyToGo = setInterval(_GetRealtime, 6000);	//5秒
						frames['mainFrame'].frames['_left'].translink('0','903');	//白银买入页面，以后会增加选
						_ShowMsg("即将买入，请勿点击任何链接");
					}
					else
					{
						_ShowMsg(_Now() + " 最大跌幅超过2.5%，禁止买入");
					}
				}
				else	//倒数第二回不是跌的情况
				{
					_StopAll();
					_AutoStart();
				}
			}
		}
		
		if (_isBuyOnly == false)
		{
			//有买入的历史记录
			for(i = 0; i < _boughtList.length; i++)
			{
				if ( _Round( _boughtList[i].price + _priceDiff ) < price )
				{
					_level = 3;		//5秒查询当前报价
					_status = 2;	//卖
					clearInterval(_intervalGetHistory);
					_intervalReadyToGo = setInterval(_GetRealtime, 6000);		//5秒
					frames['mainFrame'].frames['_left'].translink('1','903');	//白银卖出页面，以后会增加选择
					_ShowMsg("即将卖出，请勿点击任何链接");
					break;
				}
			}
		}
	}
	catch (e)
	{
		_ShowMsg(_Now() + e.message);
	}

}

function _GetPH(sell)
{
	var ph;			//浮动盈亏
	var avg = 0;	//均价
	var mount = 0;	//仓里总数量
	var stock = 0;	//仓里总额

	for(i = 0; i < _boughtList.length; i++)
	{
		mount += _boughtList[i].mount;
		stock += _boughtList[i].price * _boughtList[i].mount;
	}
	if (stock > 0)
	{
		ph = _Round(sell * mount - stock);
		avg = _Round(stock / mount);
	}
	else
	{
		ph = "尚未买入";
	}
	return {'ph':ph, 'avg':avg, 'mount':mount};
}

function _NotEnoughMoney(price)
{
	try
	{
		var txtMount = document.getElementById("_txtMount");
		var mount = txtMount.value;
		var frame = frames['mainFrame'].frames['_right'];
		var doc = frame.document.documentElement.innerText.replace(",", "");
		var moneyStart = doc.indexOf("可用资金：");
		var moneyEnd = doc.indexOf("最多可买：");
		var money = doc.substring(moneyStart + 5, moneyEnd);
		//页面不对
		if ( ( money.indexOf("美元") >= 0 )
		  || ( money.indexOf("待查询") >= 0 ) )
		{
			_PreventTimeOut();
			return true;	
		}
		//余额不足
		else if ( parseFloat( money ) < _Round( price * mount ) )
		{
			if ( parseFloat( money ) < _Round( price * 100 ) )
			{
				return true;
			}
			else
			{
				//自动设置可以买入的数量
				txtMount.value = Math.floor( parseFloat( money ) / price );
				return false;
			}
		}
		//已套牢3笔交易
		else if ( ( _boughtList.length >= 3 )
			   && ( _isHalf == false ) )
		{
			//交易数量减半
			txtMount.value = ( _Round( mount / 2 ) >= 100 ) ? _Round( mount / 2 ) : mount;
			_isHalf = true;
			return false;
		}
		else
		{
			return false;
		}
	}
	catch (e)
	{
		_PreventTimeOut();
		_ShowMsg(_Now() + e.message);
		return true;
	}
}

//停止操作
function _StopAll()
{
	clearInterval(_intervalGetHistory);
    clearInterval(_intervalPreventTimeOut);
	clearInterval(_intervalReadyToGo);
	clearInterval(_intervalConfirm);
	_cntBuy = 0;		//涨的回数
	_cntSell = 0;
	_baseBuy = 0; 
	_baseSell = 0;
	_buyBtm = 0;
	_buyTop = 0;
	_sellBtm = 0;
	_sellTop = 0;
	_status = 0;
	_level = 1;
	_isHalf = false;
    _ShowMsg("已停止");
}

function _AutoStart()
{
	_ShowMsg("等待交易时机");

	clearInterval(_intervalGetHistory);
    clearInterval(_intervalPreventTimeOut);
	clearInterval(_intervalReadyToGo);

	_intervalPreventTimeOut = setInterval(_PreventTimeOut, 301000);	//5分钟
	_intervalGetHistory = setInterval(_GetHistory_realtime, 31000);	//30秒
}

function _Init()
{
	try
	{
		clearInterval(_intervalGetHistory);
		clearInterval(_intervalPreventTimeOut);
		clearInterval(_intervalReadyToGo);
		clearInterval(_intervalConfirm);
		_cntBuy = 0;		//涨的回数
		_cntSell = 0;
		_baseBuy = 0; 
		_baseSell = 0;
		_buyBtm = 0;
		_buyTop = 0;
		_sellBtm = 0;
		_sellTop = 0;
		_status = 0;
		_level = 1;
		_isHalf = false;
		var form = frames['mainFrame'].leftform;
		_areaCode = form.area_code.value;
		_dseSessionId = form.dse_sessionId.value;
		_GetRealtime();
		_PreventTimeOut();	//防止过期
		if (_boughtList.length > 0)
		{
			_SetCookie();
		}
		var cookie = _GetCookie();
		if (cookie)
		{
			_boughtList = cookie;
		}
	}
	catch (e)
	{
		_ShowMsg(_Now() + e.message);
	}
}

function _PreventTimeOut()
{
	try
	{
		if (_status == 2)
		{
			frames['mainFrame'].frames['_right'].queryBalance('1');
			frames['mainFrame'].frames['_left'].translink('1','903');	//白银卖出页面，以后会增加选择
		}
		else
		{
			frames['mainFrame'].frames['_left'].translink('0','903');	//白银买入页面，以后会增加选择
			frames['mainFrame'].frames['_right'].queryBalance('1');
		}
	}
	catch (e)
	{
		_ShowMsg(_Now() + e.message);
	}
}

function _GoldPluginSet(el, htmlCode)
{
    var ua = navigator.userAgent.toLowerCase();
    if (ua.indexOf('msie') >= 0 && ua.indexOf('opera') < 0)
    {
        el.innerHTML = '<div style="display:none">for IE</div>' + htmlCode;
        el.removeChild(el.firstChild);
    }
    else
    {
        var el_next = el.nextSibling;
        var el_parent = el.parentNode;
        el_parent.removeChild(el);
        el.innerHTML = htmlCode;
        if (el_next)
        {
            el_parent.insertBefore(el, el_next)
        }
        else
        {
            el_parent.appendChild(el);
        }
    }
}

function _ShowMsg(str)
{
    document.getElementById("_msg").innerHTML = str;
}

function _SetLog(str)
{
	document.getElementById("_log").innerHTML += str + "<br>";
}

function _ClearLog()
{
	document.getElementById("_log").innerHTML = "";
}

function _ShowDebug(str)
{
	document.getElementById("_debug").innerHTML = str;
}

function _Round(num)
{
	try
	{
		if (typeof num == "number")
		{
			return ( Math.round( num * 100 ) / 100 );
		}
		else
		{
			return ( Math.round( parseFloat( num ) * 100 ) / 100 )
		}		
	}
	catch (e)
	{
		throw(e);
	}
}

function _Now(date)
{
	var time = date || new Date();
	return time.toLocaleTimeString();
}

function _createXmlHttp()
{
    var _xmlhttp = false;

    try
    {
        _xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
    }
    catch (e)
    {
        try
        {
            _xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
        }
        catch (E)
        {
            _xmlhttp = false;
        }
    }
    if (!_xmlhttp && typeof XMLHttpRequest != 'undefined')
    {
        _xmlhttp = new XMLHttpRequest();
    }

    return _xmlhttp;
}

function _checkXmlHttp()
{
    if ( typeof(_xmlhttp) == "undefined")
    {
        _xmlhttp = _createXmlHttp();
    }
    if (
        ! _xmlhttp
        || _xmlhttp.readyState == 1
        || _xmlhttp.readyState == 2
        || _xmlhttp.readyState == 3
        )
    {
        return false;
    }
    return true;
}

function _getXmlHttp(url, para, callback, raw)
{
    if (!_checkXmlHttp())
    {
        return;
    }

	if(url.indexOf("#") > 0)
	{
		url = url.substring(0, url.indexOf("#"));
	}
    _xmlhttp.open("POST", url, true);

    _xmlhttp.onreadystatechange = function ()
    {
        if (_xmlhttp.readyState == 4 && _xmlhttp.status == 200)
        {
			if (raw)
			{
				callback(_xmlhttp);
			}
			else
			{
	        	callback(_xmlhttp.responseText);
			}
        }
    }

    _xmlhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    _xmlhttp.send(para);
    
    document.getElementById("_xmlHttpStatus").innerHTML = "查询时间：" + _Now();
}

if(!document.getElementById('_GoldPlugin_layer'))
{
    _GoldPluginInit();
}
else
{
    document.body.removeChild(document.getElementById('_GoldPlugin_layer'));
    _GoldPluginInit();
}

//---------------------------------
var JSON;
if (!JSON)
{
    JSON = {};
}
(function ()
{
    "use strict";

    function f(n)
    {
        return n < 10 ? '0' + n : n;
    }
    if (typeof Date.prototype.toJSON !== 'function')
    {
        Date.prototype.toJSON = function (key)
        {
            return isFinite(this.valueOf()) ? this.getUTCFullYear() + '-' + f(this.getUTCMonth() + 1) + '-' + f(this.getUTCDate()) + 'T' + f(this.getUTCHours()) + ':' + f(this.getUTCMinutes()) + ':' + f(this.getUTCSeconds()) + 'Z' : null;
        };
        String.prototype.toJSON = Number.prototype.toJSON = Boolean.prototype.toJSON = function (key)
        {
            return this.valueOf();
        };
    }
    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap, indent, meta = {
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"': '\\"',
            '\\': '\\\\'
        },
        rep;

    function quote(string)
    {
        escapable.lastIndex = 0;
        return escapable.test(string) ? '"' + string.replace(escapable, function (a)
        {
            var c = meta[a];
            return typeof c === 'string' ? c : '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
        }) + '"' : '"' + string + '"';
    }

    function str(key, holder)
    {
        var i, k, v, length, mind = gap,
            partial, value = holder[key];
        if (value && typeof value === 'object' && typeof value.toJSON === 'function')
        {
            value = value.toJSON(key);
        }
        if (typeof rep === 'function')
        {
            value = rep.call(holder, key, value);
        }
        switch (typeof value)
        {
        case 'string':
            return quote(value);
        case 'number':
            return isFinite(value) ? String(value) : 'null';
        case 'boolean':
        case 'null':
            return String(value);
        case 'object':
            if (!value)
            {
                return 'null';
            }
            gap += indent;
            partial = [];
            if (Object.prototype.toString.apply(value) === '[object Array]')
            {
                length = value.length;
                for (i = 0; i < length; i += 1)
                {
                    partial[i] = str(i, value) || 'null';
                }
                v = partial.length === 0 ? '[]' : gap ? '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' : '[' + partial.join(',') + ']';
                gap = mind;
                return v;
            }
            if (rep && typeof rep === 'object')
            {
                length = rep.length;
                for (i = 0; i < length; i += 1)
                {
                    if (typeof rep[i] === 'string')
                    {
                        k = rep[i];
                        v = str(k, value);
                        if (v)
                        {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }
            else
            {
                for (k in value)
                {
                    if (Object.prototype.hasOwnProperty.call(value, k))
                    {
                        v = str(k, value);
                        if (v)
                        {
                            partial.push(quote(k) + (gap ? ': ' : ':') + v);
                        }
                    }
                }
            }
            v = partial.length === 0 ? '{}' : gap ? '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' : '{' + partial.join(',') + '}';
            gap = mind;
            return v;
        }
    }
    if (typeof JSON.stringify !== 'function')
    {
        JSON.stringify = function (value, replacer, space)
        {
            var i;
            gap = '';
            indent = '';
            if (typeof space === 'number')
            {
                for (i = 0; i < space; i += 1)
                {
                    indent += ' ';
                }
            }
            else if (typeof space === 'string')
            {
                indent = space;
            }
            rep = replacer;
            if (replacer && typeof replacer !== 'function' && (typeof replacer !== 'object' || typeof replacer.length !== 'number'))
            {
                throw new Error('JSON.stringify');
            }
            return str('', {'': value});
        };
    }
    if (typeof JSON.parse !== 'function')
    {
        JSON.parse = function (text, reviver)
        {
            var j;

            function walk(holder, key)
            {
                var k, v, value = holder[key];
                if (value && typeof value === 'object')
                {
                    for (k in value)
                    {
                        if (Object.prototype.hasOwnProperty.call(value, k))
                        {
                            v = walk(value, k);
                            if (v !== undefined)
                            {
                                value[k] = v;
                            }
                            else
                            {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }
            text = String(text);
            cx.lastIndex = 0;
            if (cx.test(text))
            {
                text = text.replace(cx, function (a)
                {
                    return '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }
            if (/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').replace(/(?:^|:|,)(?:\s*\[)+/g, '')))
            {
                j = eval('(' + text + ')');
                return typeof reviver === 'function' ? walk(
                {
                    '': j
                }, '') : j;
            }
            throw new SyntaxError('JSON.parse');
        };
    }
}());

var Cookie = {
    options: {
        path: '/',
        domain: false,
        duration: false,
        secure: false,
        document: document,
        encode: true
    },

    merge: function (source, target)
    {
        for (var key in source)
        {
            for (var k in target)
            {
                if (key == k)
                {
                    source[key] = target[k];
                    break;
                }
            }
        }
        return source;
    },

    read: function (key)
    {
        var value = this.options.document.cookie.match('(?:^|;)\\s*' + key.replace(/([-.*+?^${}()|[\]\/\\])/g, '\\$1') + '=([^;]*)');
        return (value) ? decodeURIComponent(value[1]) : null;
    },

    write: function (key, value, options)
    {
        this.options = this.merge(this.options, options);
        if (this.options.encode) value = encodeURIComponent(value);
        if (this.options.domain) value += '; domain=' + this.options.domain;
        if (this.options.path) value += '; path=' + this.options.path;
        if (this.options.duration)
        {
            var date = new Date();
            date.setTime(date.getTime() + this.options.duration * 24 * 60 * 60 * 1000);
            value += '; expires=' + date.toUTCString();
        }
        if (this.options.secure) value += '; secure';
        this.options.document.cookie = key + '=' + value;
    },

    dispose: function (key)
    {
        this.write(key, '', {duration: -1});
    }
}

function GB2UTF8(data)
{
	var ret;
	var oStream;
	oStream = new ActiveXObject("ADODB.Stream");
	oStream.Type = 1;	//以二进制模式打开
	oStream.Mode = 3;	//以读写方式打开
	oStream.Open();
	oStream.Write(data);
	oStream.Position = 0;
	oStream.Type = 2;	//以文本模式打开
	oStream.Charset = "GB2312";
	ret = oStream.ReadText();
	oStream.Close();
	return ret;
}

//javascript:void((function(){var%20element=top.frames['indexFrame'].frames['downFrame'].document.createElement('script');element.setAttribute('src','file:///D:/GoldPlugin.js');top.frames['indexFrame'].frames['downFrame'].document.body.appendChild(element);})())

