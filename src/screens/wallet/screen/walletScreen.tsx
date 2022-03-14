/* eslint-disable react/jsx-wrap-multilines */
import React, { Fragment, useState, useEffect } from 'react';
import { SafeAreaView, View, RefreshControl, Text, Alert } from 'react-native';

// Containers
import { FlatList } from 'react-native-gesture-handler';
import { useIntl } from 'react-intl';
import { LoggedInContainer } from '../../../containers';

// Components
import {
  Header,
  HorizontalIconList,
  ListPlaceHolder,
  PostCardPlaceHolder,
  PostPlaceHolder,
} from '../../../components';


// Styles
import globalStyles from '../../../globalStyles';
import styles from './walletScreenStyles';

import { useAppDispatch, useAppSelector } from '../../../hooks';
import {CoinCard} from '../children';
import { fetchMarketChart, INTERVAL_HOURLY } from '../../../providers/coingecko/coingecko';
import { withNavigation } from 'react-navigation';
import ROUTES from '../../../constants/routeNames';
import { CoinDetailsScreenParams } from '../../coinDetails/screen/coinDetailsScreen';
import POINTS, { POINTS_KEYS } from '../../../constants/options/points';
import { CoinBase, CoinData } from '../../../redux/reducers/walletReducer';
import { resetWalletData, setCoinsData, setPriceHistory } from '../../../redux/actions/walletActions';
import { fetchCoinsData } from '../../../utils/wallet';
import { COIN_IDS } from '../../../constants/defaultCoins';
import { claimPoints } from '../../../providers/ecency/ePoint';
import { claimRewardBalance, getAccount } from '../../../providers/hive/dhive';
import { toastNotification } from '../../../redux/actions/uiAction';
import moment from 'moment';


const CHART_DAYS_RANGE = 1;

const WalletScreen = ({navigation}) => {
  const intl = useIntl();
  const dispatch = useAppDispatch();

  const isDarkTheme = useAppSelector((state) => state.application.isDarkTheme);
  const currency = useAppSelector((state)=>state.application.currency);

  const { 
    selectedCoins, 
    priceHistories,
    coinsData,
    updateTimestamp,
    quotes,
    ...wallet
  } = useAppSelector((state)=>state.wallet);

  const globalProps = useAppSelector((state)=>state.account.globalProps);
  const currentAccount = useAppSelector((state)=>state.account.currentAccount);
  const pinHash = useAppSelector((state)=>state.application.pin);


  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);


  useEffect(()=>{
    _fetchData();
  },[])

  useEffect(()=>{
    if(currency.currency !== wallet.vsCurrency || currentAccount.username !== wallet.username ){
      dispatch(resetWalletData());
      _fetchData();
    }
  },[currency, currentAccount])

  const _fetchData = (refresh?:boolean) => {
    if(!isLoading){
      _fetchPriceHistory();
      _fetchCoinsData(refresh);
    }
  } 


  const _fetchPriceHistory = () => {
    selectedCoins.forEach(async (token:CoinBase)=>{

      if(!token.notCrypto){
        const marketChart = await fetchMarketChart(token.id, currency.currency, CHART_DAYS_RANGE, INTERVAL_HOURLY);
        const priceData = marketChart.prices.map(item=>item.yValue);
        dispatch(setPriceHistory(token.id, currency.currency, priceData));
      }
      
    })
  }

  const _fetchCoinsData = async (refresh?:boolean) => {
    setIsLoading(true);
    const coinData = await fetchCoinsData({
      coins:selectedCoins, 
      currentAccount, 
      vsCurrency:currency.currency, 
      globalProps,
      quotes,
      refresh
    });
    
    console.log("Coins Data", coinData)
    dispatch(setCoinsData(coinData))
    setRefreshing(false);
    setIsLoading(false);
  }

  const _claimEcencyPoints = async () => {
    setIsClaiming(true);
    try{
      await claimPoints()
      await _fetchCoinsData(true); 
    }catch(error){
      Alert.alert(`${error.message}\nTry again or write to support@ecency.com`);
    }
    setIsClaiming(false);
  };


  const _claimRewardBalance = async () => {
    setIsClaiming(true);
    try{
      const account = await getAccount(currentAccount.name);
      await claimRewardBalance(
        currentAccount,
        pinHash,
        account.reward_hive_balance,
        account.reward_hbd_balance,
        account.reward_vesting_balance,
      )
      await _fetchCoinsData(true);
      dispatch(
        toastNotification(
          intl.formatMessage({
            id: 'alert.claim_reward_balance_ok',
          }),
        ),
      );

    }catch(error){
      Alert.alert(`Failed to claim rewards, ${error.message}\nTry again or write to support@ecency.com`);
    }
    setIsClaiming(false);
  }


  const _claimRewards = (coinId:string) => {
    if(isLoading){
      setRefreshing(true);
      Alert.alert("Wallet update in progress, try again as update finishes");
      return;
    }
    switch(coinId){
      case COIN_IDS.ECENCY:
        _claimEcencyPoints();
        break;
      
      case COIN_IDS.HP:
        _claimRewardBalance()
        break;
      
    }
  }



  const _renderItem = ({ item, index }:{item:CoinBase, index:number}) => {
    const coinData:CoinData = coinsData[item.id] || {};

    const _tokenMarketData:number[] = priceHistories[item.id] ? priceHistories[item.id].data : [];

    const _balance = coinData.balance + (coinData.savings || 0);
    const quote = quotes[item.id];

    const _onCardPress = () => {
      navigation.navigate(ROUTES.SCREENS.COIN_DETAILS, {
        coinId:item.id
      } as CoinDetailsScreenParams)
    }

    const _onClaimPress = () => {
      if(coinData.unclaimedBalance){
        _claimRewards(item.id);
      } else if(item.id === COIN_IDS.ECENCY) {
        navigation.navigate(ROUTES.SCREENS.BOOST)
      }
    }
  

    return (
      <CoinCard 
        chartData={_tokenMarketData || []} 
        currentValue={quote.price}
        changePercent={quote.percentChange}
        currencySymbol={currency.currencySymbol}
        ownedTokens={_balance}
        unclaimedRewards={coinData.unclaimedBalance}
        enableBuy={!coinData.unclaimedBalance && item.id === COIN_IDS.ECENCY}
        isClaiming={isClaiming}
        onCardPress={_onCardPress}
        onClaimPress={_onClaimPress}
        footerComponent={index === 0 && <HorizontalIconList options={POINTS} optionsKeys={POINTS_KEYS} />}
        {...item} />
    );
  };

  const _renderHeader = () => {
    return (
      <View style={styles.header}>
        <Text style={styles.lastUpdateText}>
          {isLoading 
            ? intl.formatMessage({id:'wallet.updating'})
            :`${intl.formatMessage({id:'wallet.last_updated'})} ${moment(updateTimestamp).format('HH:mm:ss')}`}
        </Text>
      </View>
    )
  }


  const _refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => {_fetchData(true); setRefreshing(true)}}
      progressBackgroundColor="#357CE6"
      tintColor={!isDarkTheme ? '#357ce6' : '#96c0ff'}
      titleColor="#fff"
      colors={['#fff']}
    />
  );


  return (
    <Fragment>
      <Header />
      <SafeAreaView style={globalStyles.defaultContainer}>
        <LoggedInContainer>
          {() => (
            <View style={styles.listWrapper}>
              <FlatList
                data={updateTimestamp ? selectedCoins : []}
                extraData={[coinsData, priceHistories]}
                style={globalStyles.tabBarBottom}
                ListEmptyComponent={<PostCardPlaceHolder />}
                ListHeaderComponent={_renderHeader}
                renderItem={_renderItem}
                keyExtractor={(item, index) => index.toString()}
                refreshControl={_refreshControl}
              />
            </View>
          )}
        </LoggedInContainer>
      </SafeAreaView>
    </Fragment>
  );
};

export default withNavigation(WalletScreen);
/* eslint-enable */
