import React, { Fragment, useEffect, useRef, useState } from "react";
import { findNodeHandle, NativeModules, View, TouchableOpacity, Text } from "react-native";
import { useAppSelector } from "../../../hooks";
import { PulseAnimation } from "../../animations";
import { isVoted as isVotedFunc, isDownVoted as isDownVotedFunc } from '../../../utils/postParser';
import Icon from "../../icon";
import styles from './children.styles';
import { FormattedCurrency } from "../../formatedElements";
import { Rect } from "react-native-modal-popover/lib/PopoverGeometry";
import { PostTypes } from "../../../constants/postTypes";

interface UpvoteButtonProps {
    content: any,
    activeVotes: any[],
    isShowPayoutValue?: boolean,
    boldPayout?: boolean,
    parentType?: PostTypes;
    onUpvotePress: (anchorRect: Rect, onVotingStart: (isVoting:boolean)=>void) => void,
    onPayoutDetailsPress: (anchorRef: Rect) => void,
}

export const UpvoteButton = ({
    content,
    activeVotes,
    isShowPayoutValue,
    boldPayout,
    onUpvotePress,
    onPayoutDetailsPress
}: UpvoteButtonProps) => {

    const upvoteRef = useRef(null);
    const detailsRef = useRef(null);

    const currentAccount = useAppSelector((state => state.account.currentAccount));

    const [isVoted, setIsVoted] = useState(null);
    const [isDownVoted, setIsDownVoted] = useState(null);
    const [isVoting, setIsVoting] = useState(false);


    useEffect(() => {
        let _isMounted = true;

        const _calculateVoteStatus = async () => {

            //TODO: do this heavy lifting during parsing or react-query/cache response
            const _isVoted = await isVotedFunc(activeVotes, currentAccount?.name);
            const _isDownVoted = await isDownVotedFunc(activeVotes, currentAccount?.name);

            if (_isMounted) {
                setIsVoted(_isVoted && parseInt(_isVoted, 10) / 10000);
                setIsDownVoted(_isDownVoted && (parseInt(_isDownVoted, 10) / 10000) * -1);
            }
        };

        _calculateVoteStatus();
        setIsVoting(false);
        return () => { _isMounted = false };
    }, [activeVotes]);


    const _getRectFromRef = (ref: any, callback: (anchorRect: Rect, onVotingStart?) => void) => {
        const handle = findNodeHandle(ref.current);
        if (handle) {
            NativeModules.UIManager.measure(handle, (x0, y0, width, height, x, y) => {
                const anchorRect: Rect = { x, y, width, height };
                callback(anchorRect, (_isVoting) => {
                    setIsVoting(_isVoting);
                })
            });
        }
    }


    const _onPress = () => {
        _getRectFromRef(upvoteRef, onUpvotePress);
    }

    const _onDetailsPress = () => {
        _getRectFromRef(detailsRef, onPayoutDetailsPress)
    }


    const isDeclinedPayout = content?.is_declined_payout;
    const totalPayout = content?.total_payout;
    const maxPayout = content?.max_payout;

    const payoutLimitHit = totalPayout >= maxPayout;
    const _shownPayout = payoutLimitHit && maxPayout > 0 ? maxPayout : totalPayout;




    let iconName = 'upcircleo';
    const iconType = 'AntDesign';
    let downVoteIconName = 'downcircleo';

    if (isVoted) {
        iconName = 'upcircle';
    }

    if (isDownVoted) {
        downVoteIconName = 'downcircle';
    }



    return (
        <View style={styles.container}>
            <TouchableOpacity
                ref={upvoteRef}
                onPress={_onPress}
                style={styles.upvoteButton}
            >
                <Fragment>
                    {isVoting ? (
                        <View style={{ width: 19 }}>
                            <PulseAnimation
                                color="#357ce6"
                                numPulses={1}
                                diameter={20}
                                speed={100}
                                duration={1500}
                                isShow={!isVoting}
                            />
                        </View>
                    ) : (
                        <View hitSlop={{ top: 10, bottom: 10, left: 10, right: 5 }}>
                            <Icon
                                style={[styles.upvoteIcon, isDownVoted && { color: '#ec8b88' }]}
                                active={!currentAccount}
                                iconType={iconType}
                                name={isDownVoted ? downVoteIconName : iconName}
                            />
                        </View>
                    )}
                </Fragment>
            </TouchableOpacity>
            <View style={styles.payoutTextButton}>
                {isShowPayoutValue && (
                    <TouchableOpacity ref={detailsRef} onPress={_onDetailsPress} >
                        <Text
                            style={[
                                styles.payoutValue,
                                isDeclinedPayout && styles.declinedPayout,
                                boldPayout && styles.boldText,
                            ]}
                        >
                            {<FormattedCurrency value={_shownPayout || '0.000'} />}
                        </Text>
                    </TouchableOpacity>

                )}
            </View>
        </View>

    )
}
